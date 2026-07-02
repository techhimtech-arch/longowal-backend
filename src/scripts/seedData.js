const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Role = require('../models/Role');
const UserType = require('../models/UserType');
const UserRole = require('../models/UserRole');
const Customer = require('../models/Customer');
const Firm = require('../models/Firm');
const MasterData = require('../models/MasterData');
const { hashPassword } = require('../utils/password');
const logger = require('../config/logger');

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

const defaultUsers = [
  {
    email: 'admin@evergreen.com',
    password: 'Admin123!@#',
    firstName: 'Super',
    lastName: 'Admin',
    phoneNumber: '9876543210',
    userType: 'SUPER_ADMIN',
    roleName: 'SUPERADMIN'
  },
  {
    email: 'md@evergreen.com',
    password: 'Md123!@#',
    firstName: 'Managing',
    lastName: 'Director',
    phoneNumber: '9876543211',
    userType: 'SUPER_ADMIN', // MD shares high privileges, or custom
    roleName: 'MD'
  },
  {
    email: 'sales@evergreen.com',
    password: 'Sales123!@#',
    firstName: 'Sales',
    lastName: 'Executive',
    phoneNumber: '9876543212',
    userType: 'ORG_ADMIN',
    roleName: 'SALESEXECUTIVE'
  },
  {
    email: 'logistics@evergreen.com',
    password: 'Logistics123!@#',
    firstName: 'Logistics',
    lastName: 'Manager',
    phoneNumber: '9876543213',
    userType: 'LOGISTICS_TEAM',
    roleName: 'LOGISTICS'
  },
  {
    email: 'accounts@evergreen.com',
    password: 'Accounts123!@#',
    firstName: 'Accounts',
    lastName: 'Officer',
    phoneNumber: '9876543214',
    userType: 'CITIZEN', // mapped to accounts
    roleName: 'ACCOUNTS'
  }
];

async function seedData() {
  try {
    logger.info('Data Seeding: Connecting to database...');
    await connectDB();
    logger.info('Data Seeding: Connected.');

    // 1. Seed Master Data (States)
    logger.info('Data Seeding: Seeding states...');
    let stateCount = 0;
    for (const state of states) {
      const existing = await MasterData.findOne({ category: 'STATE', key: state.key });
      if (!existing) {
        await MasterData.create({
          category: 'STATE',
          key: state.key,
          value: { name: state.name },
          isActive: true,
          remarks: 'System Seeded'
        });
        stateCount++;
      }
    }
    logger.info(`Data Seeding: Finished states. Added ${stateCount} states.`);

    // 2. Fetch UserTypes & Roles
    const dbRoles = {};
    const dbUserTypes = {};
    
    const allRoles = await Role.find({});
    for (const r of allRoles) {
      dbRoles[r.name] = r._id;
    }

    const allUserTypes = await UserType.find({});
    for (const ut of allUserTypes) {
      dbUserTypes[ut.name] = ut._id;
    }

    // 3. Seed Default Users
    logger.info('Data Seeding: Seeding users...');
    for (const u of defaultUsers) {
      const existingUser = await User.findOne({ email: u.email });
      if (!existingUser) {
        const hashedPassword = await hashPassword(u.password);
        const roleId = dbRoles[u.roleName];
        
        // Find corresponding UserType Object
        let utName = 'STAFF';
        if (u.userType === 'SUPER_ADMIN') utName = 'ADMIN';
        if (u.userType === 'CITIZEN') utName = 'CUSTOMER';
        const userTypeId = dbUserTypes[utName];

        const newUser = await User.create({
          email: u.email,
          passwordHash: hashedPassword,
          firstName: u.firstName,
          lastName: u.lastName,
          phoneNumber: u.phoneNumber,
          userType: u.userType,
          userTypeId: userTypeId || null,
          roleId: roleId || null,
          status: 'ACTIVE',
          emailVerified: true
        });

        if (roleId) {
          await UserRole.create({
            userId: newUser._id,
            roleId: roleId
          });
        }
        logger.info(`Data Seeding: Created user ${u.email} with role ${u.roleName}`);
      }
    }

    // 4. Seed Default Customer
    logger.info('Data Seeding: Seeding default customer...');
    const custExists = await Customer.findOne({ customerCode: 'CUST-001' });
    if (!custExists) {
      await Customer.create({
        customerCode: 'CUST-001',
        companyName: 'Acme Industries',
        gstNumber: '07AAAAA1111A1Z1',
        panNumber: 'AAAAA1111A',
        primaryContact: {
          name: 'John Doe',
          mobile: '9999988888',
          email: 'johndoe@acme.com'
        },
        billingAddress: {
          line1: '123 Business Park',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          pincode: '110001'
        },
        shippingAddress: {
          line1: '123 Business Park',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          pincode: '110001'
        },
        creditLimit: 5000000,
        paymentTerms: 'Net 30',
        customerCategory: 'VIP',
        stats: {
          totalOrders: 0,
          totalRevenue: 0,
          outstandingAmount: 0
        },
        status: 'ACTIVE'
      });
      logger.info('Data Seeding: Created default customer.');
    }

    // 5. Seed Default Firm
    logger.info('Data Seeding: Seeding default execution firm...');
    const firmExists = await Firm.findOne({ gstNumber: '07BBBBB2222B2Z2' });
    if (!firmExists) {
      await Firm.create({
        firmName: 'Longowal Logistics & Execution Ltd',
        gstNumber: '07BBBBB2222B2Z2',
        panNumber: 'BBBBB2222B',
        billingAddress: {
          line1: 'Plot 45, Phase III',
          city: 'Chandigarh',
          state: 'Punjab',
          country: 'India',
          pincode: '160002'
        },
        bankDetails: {
          bankName: 'State Bank of India',
          accountNumber: '12345678901',
          ifscCode: 'SBIN0000123'
        },
        isActive: true
      });
      logger.info('Data Seeding: Created default firm.');
    }

    logger.info('Data Seeding completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Data Seeding failed', { error: error.message });
    if (require.main === module) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  seedData();
} else {
  module.exports = seedData;
}
