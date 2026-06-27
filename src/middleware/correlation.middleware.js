const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Request correlation ID middleware
 * Adds a unique ID to each request for tracking and debugging
 */
const correlationMiddleware = (req, res, next) => {
  // Get correlation ID from header or generate new one
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Add to request object
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Add correlation ID to logger context
  logger.defaultMeta = {
    ...logger.defaultMeta,
    correlationId
  };
  
  // Log request start
  logger.info('Request started', {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.user?.userId
  });
  
  // Override res.end to log response completion
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    logger.info('Request completed', {
      correlationId,
      statusCode: res.statusCode,
      method: req.method,
      url: req.originalUrl,
      duration: Date.now() - req.startTime,
      userId: req.user?.userId
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  // Track request start time
  req.startTime = Date.now();
  
  next();
};

module.exports = correlationMiddleware;
