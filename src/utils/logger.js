const winston = require('winston');

const { combine, timestamp, json, errors } = winston.format;

// Custom format for structured JSON logs
const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }), // Include stack trace for errors
  json()
);

// Create logger instance - Console transport only (Render captures stdout/stderr)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'sms-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Helper to log with request context
logger.withRequest = (req) => ({
  info: (message, meta = {}) => logger.info(message, { requestId: req.requestId, ...meta }),
  warn: (message, meta = {}) => logger.warn(message, { requestId: req.requestId, ...meta }),
  error: (message, meta = {}) => logger.error(message, { requestId: req.requestId, ...meta }),
  debug: (message, meta = {}) => logger.debug(message, { requestId: req.requestId, ...meta }),
});

module.exports = logger;
