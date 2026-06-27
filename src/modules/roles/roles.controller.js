const Role = require('../../models/Role');
const { sendSuccess, sendError, sendNotFound } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/error.middleware');
const logger = require('../../config/logger');

class RolesController {
  /**
   * Get all roles
   */
  getRoles = asyncHandler(async (req, res) => {
    const { organizationId, includeInactive = false } = req.query;

    let query = {};
    if (organizationId) {
      query.organizationId = organizationId;
    }
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const roles = await Role.find(query).populate('organizationId', 'name');

    return sendSuccess(res, 200, 'Roles retrieved successfully', roles);
  });

  /**
   * Get role by name
   */
  getRoleByName = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const role = await Role.findOne({ name }).populate('organizationId', 'name');

    if (!role) {
      return sendNotFound(res, 'Role not found');
    }

    return sendSuccess(res, 200, 'Role retrieved successfully', role);
  });

  /**
   * Create a new role
   */
  createRole = asyncHandler(async (req, res) => {
    const { name, description, permissions, organizationId } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return sendError(res, 400, 'Role with this name already exists');
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
      creatorId: req.user?.userId,
    });

    return sendSuccess(res, 201, 'Role created successfully', role);
  });

  /**
   * Update role
   */
  updateRole = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { description, permissions, isActive } = req.body;

    const role = await Role.findOne({ name });
    if (!role) {
      return sendNotFound(res, 'Role not found');
    }

    // Don't allow updating superadmin role
    if (role.name === 'superadmin') {
      return sendError(res, 403, 'Cannot modify superadmin role');
    }

    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    logger.info('Role updated successfully', {
      roleId: role._id,
      name: role.name,
      updaterId: req.user?.userId,
    });

    return sendSuccess(res, 200, 'Role updated successfully', role);
  });

  /**
   * Delete/deactivate role
   */
  deleteRole = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const role = await Role.findOne({ name });
    if (!role) {
      return sendNotFound(res, 'Role not found');
    }

    // Don't allow deleting superadmin role
    if (role.name === 'superadmin') {
      return sendError(res, 403, 'Cannot delete superadmin role');
    }

    // Soft delete by deactivating
    role.isActive = false;
    await role.save();

    logger.info('Role deactivated successfully', {
      roleId: role._id,
      name: role.name,
      deleterId: req.user?.userId,
    });

    return sendSuccess(res, 200, 'Role deactivated successfully', role);
  });

  /**
   * Get role permissions
   */
  getRolePermissions = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const role = await Role.findOne({ name, isActive: true });
    if (!role) {
      return sendNotFound(res, 'Role not found');
    }

    return sendSuccess(res, 200, 'Role permissions retrieved', {
      role: role.name,
      permissions: role.permissions,
    });
  });

  /**
   * Check if role has specific permission
   */
  checkRolePermission = asyncHandler(async (req, res) => {
    const { name, permission } = req.params;

    const role = await Role.findOne({ name, isActive: true });
    if (!role) {
      return sendNotFound(res, 'Role not found');
    }

    const hasPermission = role.permissions.includes(permission);

    return sendSuccess(res, 200, 'Permission check completed', {
      role: role.name,
      permission,
      hasPermission,
    });
  });

  /**
   * Get available permissions list
   */
  getAvailablePermissions = asyncHandler(async (req, res) => {
    const permissions = [
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

    return sendSuccess(res, 200, 'Available permissions retrieved', permissions);
  });

  /**
   * Assign permissions to role
   */
  assignPermissions = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return sendError(res, 400, 'Permissions must be an array');
    }

    const role = await Role.findOne({ name });
    if (!role) {
      return sendNotFound(res, 'Role not found');
    }

    // Don't allow modifying superadmin role
    if (role.name === 'superadmin') {
      return sendError(res, 403, 'Cannot modify superadmin role permissions');
    }

    role.permissions = permissions;
    await role.save();

    logger.info('Role permissions updated', {
      roleId: role._id,
      name: role.name,
      permissions,
      updaterId: req.user?.userId,
    });

    return sendSuccess(res, 200, 'Permissions assigned successfully', role);
  });

  /**
   * Get role statistics
   */
  getRoleStats = asyncHandler(async (req, res) => {
    const { schoolId } = req.query;

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

    return sendSuccess(res, 200, 'Role statistics retrieved', {
      summary: stats[0] || { totalRoles: 0, activeRoles: 0, inactiveRoles: 0 },
      distribution: roleDistribution,
    });
  });
}

module.exports = new RolesController();
