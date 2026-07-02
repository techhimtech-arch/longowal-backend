const mongoose = require('mongoose');
const connectDB = require('../config/database');
const UserType = require('../models/UserType');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const logger = require('../config/logger');

const userTypes = [
  { name: 'ADMIN', description: 'Administrator privileges' },
  { name: 'STAFF', description: 'Internal staff member' },
  { name: 'CUSTOMER', description: 'External customer / buyer' },
  { name: 'PARTNER', description: 'Third-party delivery or execution partner' }
];

const roles = [
  { name: 'SUPERADMIN', description: 'Root admin with total access to system configurations' },
  { name: 'ADMIN', description: 'General Administrator' },
  { name: 'MD', description: 'Managing Director / CMD - executive level monitoring and approvals' },
  { name: 'SALESEXECUTIVE', description: 'Sales Executive - handles customer onboarding, leads, and orders' },
  { name: 'LOGISTICS', description: 'Logistics Team - handles trip planning and dispatching' },
  { name: 'ACCOUNTS', description: 'Accounts Team - handles billing, invoices, payments, and collections' }
];

const modules = ['LEADS', 'CUSTOMERS', 'ORDERS', 'LOGISTICS', 'DISPATCH', 'INVOICES', 'PAYMENTS', 'REPORTS', 'USERS', 'ROLES'];
const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];

async function seedRbac() {
  try {
    logger.info('RBAC Seeding: Connecting to database...');
    await connectDB();
    logger.info('RBAC Seeding: Connected.');

    // 1. Seed UserTypes
    logger.info('RBAC Seeding: Seeding UserTypes...');
    const seededUserTypes = {};
    for (const ut of userTypes) {
      let existing = await UserType.findOne({ name: ut.name });
      if (!existing) {
        existing = await UserType.create(ut);
      }
      seededUserTypes[ut.name] = existing._id;
    }
    logger.info('RBAC Seeding: UserTypes completed.');

    // 2. Seed Roles
    logger.info('RBAC Seeding: Seeding Roles...');
    const seededRoles = {};
    for (const r of roles) {
      let existing = await Role.findOne({ name: r.name });
      if (!existing) {
        existing = await Role.create({
          name: r.name,
          description: r.description,
          isActive: true,
          isSystem: true
        });
      }
      seededRoles[r.name] = existing._id;
    }
    logger.info('RBAC Seeding: Roles completed.');

    // 3. Seed Permissions
    logger.info('RBAC Seeding: Seeding Permissions...');
    const seededPermissions = {};
    for (const mod of modules) {
      for (const act of actions) {
        const permName = `${act}_${mod}`;
        const description = `Can ${act.toLowerCase()} ${mod.toLowerCase()}`;
        let existing = await Permission.findOne({ name: permName });
        if (!existing) {
          existing = await Permission.create({
            name: permName,
            description,
            resource: mod,
            action: act,
            isActive: true
          });
        }
        seededPermissions[permName] = existing._id;
      }
    }
    logger.info('RBAC Seeding: Permissions completed.');

    // 4. Map RolePermissions
    logger.info('RBAC Seeding: Mapping RolePermissions...');
    
    // Helper to map permissions to a role
    const mapPermissionsToRole = async (roleName, permissionNames) => {
      const roleId = seededRoles[roleName];
      if (!roleId) return;

      for (const pName of permissionNames) {
        const permissionId = seededPermissions[pName];
        if (!permissionId) continue;

        const exists = await RolePermission.findOne({ roleId, permissionId });
        if (!exists) {
          await RolePermission.create({
            roleId,
            permissionId,
            isActive: true
          });
        }
      }
    };

    // SUPERADMIN and ADMIN get all permissions
    const allPermNames = Object.keys(seededPermissions);
    await mapPermissionsToRole('SUPERADMIN', allPermNames);
    await mapPermissionsToRole('ADMIN', allPermNames);

    // MD gets READ on all, plus MANAGE/UPDATE on orders & payments for approval
    const mdPerms = allPermNames.filter(name => 
      name.startsWith('READ_') || 
      name.includes('_ORDERS') || 
      name.includes('_PAYMENTS') ||
      name.includes('_REPORTS')
    );
    await mapPermissionsToRole('MD', mdPerms);

    // SALESEXECUTIVE gets CRUD on LEADS, CUSTOMERS, ORDERS, and READ on others
    const salesPerms = allPermNames.filter(name => 
      name.includes('_LEADS') || 
      name.includes('_CUSTOMERS') || 
      (name.includes('_ORDERS') && !name.startsWith('DELETE_')) ||
      name.startsWith('READ_')
    );
    await mapPermissionsToRole('SALESEXECUTIVE', salesPerms);

    // LOGISTICS gets READ/UPDATE/CREATE on LOGISTICS & DISPATCH, and READ on orders
    const logisticsPerms = allPermNames.filter(name => 
      name.includes('_LOGISTICS') || 
      name.includes('_DISPATCH') ||
      (name.startsWith('READ_') && name.includes('_ORDERS'))
    );
    await mapPermissionsToRole('LOGISTICS', logisticsPerms);

    // ACCOUNTS gets CRUD on INVOICES & PAYMENTS, and READ on orders
    const accountsPerms = allPermNames.filter(name => 
      name.includes('_INVOICES') || 
      name.includes('_PAYMENTS') ||
      (name.startsWith('READ_') && name.includes('_ORDERS'))
    );
    await mapPermissionsToRole('ACCOUNTS', accountsPerms);

    logger.info('RBAC Seeding completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    logger.error('RBAC Seeding failed', { error: error.message });
    if (require.main === module) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  seedRbac();
} else {
  module.exports = seedRbac;
}
