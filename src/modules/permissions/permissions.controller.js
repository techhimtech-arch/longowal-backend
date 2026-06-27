const Permission = require('../../models/Permission');
const RolePermission = require('../../models/RolePermission');
const { sendSuccess, sendError, sendNotFound } = require('../../utils/response');
const logger = require('../../config/logger');

/**
 * Get all permissions
 */
const getPermissions = async (req, res) => {
  try {
    const { resource, action, isActive } = req.query;
    
    // Build filter
    const filter = {};
    if (resource) filter.resource = resource.toUpperCase();
    if (action) filter.action = action.toUpperCase();
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const permissions = await Permission.find(filter)
      .sort({ resource: 1, action: 1 });

    sendSuccess(res, permissions, 'Permissions retrieved successfully');
  } catch (error) {
    logger.error('Error getting permissions', { error: error.message });
    sendError(res, 'Failed to retrieve permissions');
  }
};

/**
 * Get permission by ID
 */
const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const permission = await Permission.findById(id);
    
    if (!permission) {
      return sendNotFound(res, 'Permission not found');
    }

    sendSuccess(res, permission, 'Permission retrieved successfully');
  } catch (error) {
    logger.error('Error getting permission by ID', { error: error.message });
    sendError(res, 'Failed to retrieve permission');
  }
};

/**
 * Create new permission
 */
const createPermission = async (req, res) => {
  try {
    const { name, description, resource, action } = req.body;

    // Check if permission already exists
    const existingPermission = await Permission.findByName(name);
    if (existingPermission) {
      return sendError(res, 'Permission with this name already exists', 409);
    }

    const permission = new Permission({
      name: name.toUpperCase(),
      description,
      resource: resource.toUpperCase(),
      action: action.toUpperCase()
    });

    await permission.save();

    logger.info('Permission created', {
      permissionId: permission._id,
      name: permission.name,
      userId: req.user?.userId
    });

    sendSuccess(res, permission, 'Permission created successfully', 201);
  } catch (error) {
    logger.error('Error creating permission', { error: error.message });
    sendError(res, 'Failed to create permission');
  }
};

/**
 * Update permission
 */
const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, resource, action, isActive } = req.body;

    const permission = await Permission.findById(id);
    if (!permission) {
      return sendNotFound(res, 'Permission not found');
    }

    // Check if name is being changed and if new name already exists
    if (name && name.toUpperCase() !== permission.name) {
      const existingPermission = await Permission.findByName(name);
      if (existingPermission) {
        return sendError(res, 'Permission with this name already exists', 409);
      }
    }

    // Update fields
    if (name) permission.name = name.toUpperCase();
    if (description) permission.description = description;
    if (resource) permission.resource = resource.toUpperCase();
    if (action) permission.action = action.toUpperCase();
    if (isActive !== undefined) permission.isActive = isActive;

    await permission.save();

    logger.info('Permission updated', {
      permissionId: permission._id,
      name: permission.name,
      userId: req.user?.userId
    });

    sendSuccess(res, permission, 'Permission updated successfully');
  } catch (error) {
    logger.error('Error updating permission', { error: error.message });
    sendError(res, 'Failed to update permission');
  }
};

/**
 * Delete permission (soft delete by setting isActive to false)
 */
const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id);
    if (!permission) {
      return sendNotFound(res, 'Permission not found');
    }

    // Check if permission is assigned to any roles
    const rolePermissions = await RolePermission.find({
      permissionId: id,
      isActive: true
    });

    if (rolePermissions.length > 0) {
      return sendError(res, 'Cannot delete permission that is assigned to roles', 409);
    }

    permission.isActive = false;
    await permission.save();

    logger.info('Permission deleted', {
      permissionId: permission._id,
      name: permission.name,
      userId: req.user?.userId
    });

    sendSuccess(res, null, 'Permission deleted successfully');
  } catch (error) {
    logger.error('Error deleting permission', { error: error.message });
    sendError(res, 'Failed to delete permission');
  }
};

/**
 * Get permissions by role
 */
const getPermissionsByRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const rolePermissions = await RolePermission.findActivePermissionsForRole(roleId);

    sendSuccess(res, rolePermissions, 'Role permissions retrieved successfully');
  } catch (error) {
    logger.error('Error getting role permissions', { error: error.message });
    sendError(res, 'Failed to retrieve role permissions');
  }
};

module.exports = {
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionsByRole
};
