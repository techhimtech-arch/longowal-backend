const winston = require('winston');
const path = require('path');
// const config = require('./env'); // Removed to avoid circular dependency

// Create logs directory if it doesn't exist
const fs = require('fs');
// Use default path since config might not be loaded yet
const logsDir = path.dirname('logs/app.log');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  // In production, file system might be read-only, use console only
  console.log('Cannot create logs directory, using console logging only');
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// Create logger instance with console transport only to avoid file issues
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport later if possible
try {
  const config = require('./env'); // Require after env is loaded
  logger.add(new winston.transports.File({
    filename: config.logging.file,
    format: logFormat
  }));
} catch (error) {
  // If config is not loaded or file transport fails, continue with console only
  console.log('File logging not available, using console only');
}

module.exports = logger;

logger.rejections.handle(
  new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
);

module.exports = logger;
