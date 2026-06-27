const Role = require('../../models/Role');
const logger = require('../../config/logger');

class RolesService {
  /**
   * Get all roles
   */
  async getRoles(filters = {}) {
    const { organizationId, includeInactive = false } = filters;

    let query = {};
    if (organizationId) {
      query.organizationId = organizationId;
    }
    if (!includeInactive) {
      query.isActive = true;
    }

    const roles = await Role.find(query).populate('organizationId', 'name');

    return roles;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name) {
    const role = await Role.findOne({ name }).populate('organizationId', 'name');

    if (!role) {
      throw new Error('Role not found');
    }

    return role;
  }

  /**
   * Create a new role
   */
  async createRole(roleData, creatorId = null) {
    const { name, description, permissions, organizationId } = roleData;

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    const role = new Role({
      name,
      description,
      permissions,
      organizationId,
    });

    await role.save();

    logger.info('Role created successfully', {
      roleId: role._id,
      name: role.name,
      creatorId,
    });

    return role;
  }

  /**
   * Update role
   */
  async updateRole(name, updateData, updaterId = null) {
    const { description, permissions, isActive } = updateData;

    const role = await Role.findOne({ name });
    if (!role) {
      throw new Error('Role not found');
    }

    // Don't allow updating superadmin role
    if (role.name === 'superadmin') {
      throw new Error('Cannot modify superadmin role');
    }

    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    logger.info('Role updated successfully', {
      roleId: role._id,
      name: role.name,
      updaterId,
    });

    return role;
  }

  /**
   * Delete/deactivate role
   */
  async deleteRole(name, deleterId = null) {
    const role = await Role.findOne({ name });
    if (!role) {
      throw new Error('Role not found');
    }

    // Don't allow deleting superadmin role
    if (role.name === 'superadmin') {
      throw new Error('Cannot delete superadmin role');
    }

    // Soft delete by deactivating
    role.isActive = false;
    await role.save();

    logger.info('Role deactivated successfully', {
      roleId: role._id,
      name: role.name,
      deleterId,
    });

    return role;
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(name) {
    const role = await Role.findOne({ name, isActive: true });
    if (!role) {
      throw new Error('Role not found');
    }

    return {
      role: role.name,
      permissions: role.permissions,
    };
  }

  /**
   * Check if role has specific permission
   */
  async checkRolePermission(name, permission) {
    const role = await Role.findOne({ name, isActive: true });
    if (!role) {
      throw new Error('Role not found');
    }

    return {
      role: role.name,
      permission,
      hasPermission: role.permissions.includes(permission),
    };
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(name, permissions, updaterId = null) {
    const role = await Role.findOne({ name });
    if (!role) {
      throw new Error('Role not found');
    }

    // Don't allow modifying superadmin role
    if (role.name === 'superadmin') {
      throw new Error('Cannot modify superadmin role permissions');
    }

    role.permissions = permissions;
    await role.save();

    logger.info('Role permissions updated', {
      roleId: role._id,
      name: role.name,
      permissions,
      updaterId,
    });

    return role;
  }

  /**
   * Get available permissions list
   */
  getAvailablePermissions() {
    return [
      // User management
      { category: 'users', permissions: ['users:create', 'users:read', 'users:update', 'users:delete'] },
      
      // Role management
      { category: 'roles', permissions: ['roles:create', 'roles:read', 'roles:update', 'roles:delete'] },
      
      // School management
      { category: 'school', permissions: ['school:create', 'school:read', 'school:update', 'school:delete'] },
      
      // Class management
      { category: 'classes', permissions: ['classes:create', 'classes:read', 'classes:update', 'classes:delete'] },
      
      // Student management
      { category: 'students', permissions: ['students:create', 'students:read', 'students:update', 'students:delete'] },
      
      // Teacher management
      { category: 'teachers', permissions: ['teachers:create', 'teachers:read', 'teachers:update', 'teachers:delete'] },
      
      // Attendance management
      { category: 'attendance', permissions: ['attendance:create', 'attendance:read', 'attendance:update', 'attendance:delete'] },
      
      // Fee management
      { category: 'fees', permissions: ['fees:create', 'fees:read', 'fees:update', 'fees:delete'] },
      
      // Exam management
      { category: 'exams', permissions: ['exams:create', 'exams:read', 'exams:update', 'exams:delete'] },
      
      // Reports
      { category: 'reports', permissions: ['reports:read', 'reports:generate'] },
      
      // System admin
      { category: 'system', permissions: ['system:admin', 'system:audit'] },
    ];
  }

  /**
   * Get role statistics
   */
  async getRoleStats(schoolId = null) {
    const matchStage = {};
    if (schoolId) {
      matchStage.schoolId = schoolId;
    }

    const stats = await Role.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRoles: { $sum: 1 },
          activeRoles: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveRoles: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
        }
      },
      {
        $project: {
          _id: 0,
          totalRoles: 1,
          activeRoles: 1,
          inactiveRoles: 1,
        }
      }
    ]);

    const roleDistribution = await Role.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
        }
      },
      { $sort: { count: -1 } }
    ]);

    return {
      summary: stats[0] || { totalRoles: 0, activeRoles: 0, inactiveRoles: 0 },
      distribution: roleDistribution,
    };
  }

  /**
   * Initialize default roles
   */
  async initializeDefaultRoles() {
    const defaultRoles = [
      {
        name: 'superadmin',
        description: 'System super administrator with full access',
        permissions: this.getAllPermissions(),
      },
      {
        name: 'school_admin',
        description: 'School administrator with school-wide access',
        permissions: [
          'users:create', 'users:read', 'users:update', 'users:delete',
          'roles:read',
          'school:read', 'school:update',
          'classes:create', 'classes:read', 'classes:update', 'classes:delete',
          'students:create', 'students:read', 'students:update', 'students:delete',
          'teachers:create', 'teachers:read', 'teachers:update', 'teachers:delete',
          'attendance:create', 'attendance:read', 'attendance:update', 'attendance:delete',
          'fees:create', 'fees:read', 'fees:update', 'fees:delete',
          'exams:create', 'exams:read', 'exams:update', 'exams:delete',
          'reports:read', 'reports:generate',
        ],
      },
      {
        name: 'teacher',
        description: 'Teacher with classroom and student management access',
        permissions: [
          'users:read',
          'classes:read',
          'students:read', 'students:update',
          'attendance:create', 'attendance:read', 'attendance:update',
          'exams:create', 'exams:read', 'exams:update',
          'reports:read', 'reports:generate',
        ],
      },
      {
        name: 'accountant',
        description: 'Accountant with fee management access',
        permissions: [
          'users:read',
          'students:read',
          'fees:create', 'fees:read', 'fees:update',
          'reports:read',
        ],
      },
      {
        name: 'parent',
        description: 'Parent with read access to student data',
        permissions: [
          'students:read',
          'attendance:read',
          'fees:read',
          'exams:read',
          'reports:read',
        ],
      },
      {
        name: 'student',
        description: 'Student with limited access to own data',
        permissions: [
          'students:read',
          'attendance:read',
          'fees:read',
          'exams:read',
          'reports:read',
        ],
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new Role(roleData);
        await role.save();
        logger.info('Default role created', { roleName: roleData.name });
      }
    }
  }

  /**
   * Get all available permissions
   */
  getAllPermissions() {
    const permissions = this.getAvailablePermissions();
    return permissions.flatMap(category => category.permissions);
  }
}

module.exports = new RolesService();
