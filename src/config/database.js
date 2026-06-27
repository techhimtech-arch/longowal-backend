const mongoose = require('mongoose');
const config = require('./env');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 30000,  // 30s to find a server
      connectTimeoutMS: 30000,          // 30s for initial connection
      socketTimeoutMS: 45000,           // 45s for socket timeout
    });

    logger.info('MongoDB connected successfully', {
      host: conn.connection.host,
      port: conn.connection.port,
      database: conn.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection failed', { message: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
    process.exit(1);
  }
});

module.exports = connectDB;
