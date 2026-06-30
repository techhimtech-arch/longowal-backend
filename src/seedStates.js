const mongoose = require('mongoose');
const connectDB = require('./config/database');
const MasterData = require('./models/MasterData');
const logger = require('./config/logger');

const states = [
  { key: 'AP', name: 'Andhra Pradesh' },
  { key: 'AR', name: 'Arunachal Pradesh' },
  { key: 'AS', name: 'Assam' },
  { key: 'BR', name: 'Bihar' },
  { key: 'CG', name: 'Chhattisgarh' },
  { key: 'GA', name: 'Goa' },
  { key: 'GJ', name: 'Gujarat' },
  { key: 'HR', name: 'Haryana' },
  { key: 'HP', name: 'Himachal Pradesh' },
  { key: 'JH', name: 'Jharkhand' },
  { key: 'KA', name: 'Karnataka' },
  { key: 'KL', name: 'Kerala' },
  { key: 'MP', name: 'Madhya Pradesh' },
  { key: 'MH', name: 'Maharashtra' },
  { key: 'MN', name: 'Manipur' },
  { key: 'ML', name: 'Meghalaya' },
  { key: 'MZ', name: 'Mizoram' },
  { key: 'NL', name: 'Nagaland' },
  { key: 'OD', name: 'Odisha' },
  { key: 'PB', name: 'Punjab' },
  { key: 'RJ', name: 'Rajasthan' },
  { key: 'SK', name: 'Sikkim' },
  { key: 'TN', name: 'Tamil Nadu' },
  { key: 'TG', name: 'Telangana' },
  { key: 'TR', name: 'Tripura' },
  { key: 'UP', name: 'Uttar Pradesh' },
  { key: 'UK', name: 'Uttarakhand' },
  { key: 'WB', name: 'West Bengal' },
  { key: 'AN', name: 'Andaman and Nicobar Islands' },
  { key: 'CH', name: 'Chandigarh' },
  { key: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { key: 'DL', name: 'Delhi' },
  { key: 'JK', name: 'Jammu and Kashmir' },
  { key: 'LA', name: 'Ladakh' },
  { key: 'LD', name: 'Lakshadweep' },
  { key: 'PY', name: 'Puducherry' }
];

async function seed() {
  try {
    logger.info('Connecting to Database for seeding states...');
    await connectDB();
    logger.info('Database connected.');

    let count = 0;
    for (const state of states) {
      // Check if already exists
      const existing = await MasterData.findOne({ category: 'STATE', key: state.key });
      if (!existing) {
        await MasterData.create({
          category: 'STATE',
          key: state.key,
          value: { name: state.name },
          isActive: true,
          remarks: 'System Seeded'
        });
        count++;
      }
    }
    
    logger.info(`Seeding finished. Added ${count} new states.`);
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', { error: error.message });
    process.exit(1);
  }
}

seed();
