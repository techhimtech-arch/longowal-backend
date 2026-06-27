const logger = require('./config/logger');
const config = require('./config/env');
const { connectRedis } = require('./config/redis');
const correlationMiddleware = require('./middleware/correlation.middleware');

logger.info('Application starting up');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

try {
  logger.info('Configuration loaded successfully');

  // Create Express app
  const app = express();

  // Add correlation ID middleware first
  app.use(correlationMiddleware);

  // Middleware
  app.use(helmet());
  
  // Configure CORS with allowed origins
  app.use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
  }));
  
  // Custom morgan format with correlation ID
  morgan.token('correlation-id', (req) => req.correlationId || 'N/A');
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      correlationId: req.correlationId
    });
  });

  // Favicon route to prevent 404 errors
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
  });

  logger.info('Loading API routes...');
  
  // API versioning routes
  app.use(`${config.api.prefix}/${config.api.version}`, require('./routes/v1'));
  
  // Legacy routes for backward compatibility
  app.use('/api/auth', require('./modules/auth/auth.routes'));
  app.use('/api/users', require('./modules/users/users.routes'));
  app.use('/api/roles', require('./modules/roles/roles.routes'));
  app.use('/api/permissions', require('./modules/permissions/permissions.routes'));
  
  logger.info('API routes loaded successfully');

  // Swagger documentation
  const { swaggerUi, swaggerSpec } = require('../swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info('Swagger documentation available at /api-docs');

  // Error handling middleware
  const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
  app.use(notFoundHandler);
  app.use(errorHandler);

  module.exports = { app, connectRedis };
} catch (error) {
  logger.error('Application startup failed', { error: error.message, stack: error.stack });
  process.exit(1);
}