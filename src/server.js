const logger = require('./config/logger');

logger.info('Server startup initiated');

const { app, connectRedis } = require('./app');
const config = require('./config/env');
const connectDB = require('./config/database');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

async function startServer() {
  try {
    logger.info('Connecting to MongoDB...');
    await connectDB();
    logger.info('MongoDB connected successfully');

    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connection initialized');

    const PORT = config.port;

    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        healthCheck: `http://localhost:${PORT}/health`,
        swaggerDocs: `http://localhost:${PORT}/api-docs`,
        apiV1: `http://localhost:${PORT}${config.api.prefix}/${config.api.version}`
      });
    });

    server.on('error', (error) => {
      logger.error('Server error', { error: error.message, code: error.code });
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
