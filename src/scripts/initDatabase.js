const mongoose = require('mongoose');
const connectDB = require('../config/database');
const seedRbac = require('./seedRbac');
const seedData = require('./seedData');
const logger = require('../config/logger');

async function initDatabase() {
  try {
    logger.info('Initializing database: Resetting all collections...');
    await connectDB();
    
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
      try {
        await mongoose.connection.collections[collectionName].drop();
        logger.info(`Dropped collection: ${collectionName}`);
      } catch (err) {
        // Code 26 means namespace not found (doesn't exist) which is fine
        if (err.code !== 26 && err.message !== 'ns not found') {
          logger.warn(`Error dropping collection ${collectionName}: ${err.message}`);
        }
      }
    }
    
    logger.info('Database cleared. Starting RBAC seeding...');
    await seedRbac();
    
    logger.info('RBAC seeding finished. Starting data seeding...');
    await seedData();
    
    logger.info('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    process.exit(1);
  }
}

initDatabase();
