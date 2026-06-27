const Permission = require('../../models/Permission');
const RolePermission = require('../../models/RolePermission');
const logger = require('../../config/logger');

class PermissionService {
  /**
   * Find permission by name
   */
  static async findByName(name) {
    return await Permission.findByName(name.toUpperCase());
  }

  /**
   * Find permission by resource and action
   */
  static async findByResourceAction(resource, action) {
    return await Permission.findByResourceAction(resource.toUpperCase(), action.toUpperCase());
  }

  /**
   * Get all permissions with optional filtering
   */
  static async getAll(filter = {}) {
    return await Permission.find(filter).sort({ resource: 1, action: 1 });
  }

  /**
   * Get permission by ID
   */
  static async getById(id) {
    return await Permission.findById(id);
  }

  /**
   * Create new permission
   */
  static async create(permissionData) {
    const permission = new Permission({
      ...permissionData,
      name: permissionData.name.toUpperCase(),
      resource: permissionData.resource.toUpperCase(),
      action: permissionData.action.toUpperCase()
    });
    
    return await permission.save();
  }

  /**
   * Update permission
   */
  static async update(id, updateData) {
    const updateObj = { ...updateData };
    
    if (updateObj.name) updateObj.name = updateObj.name.toUpperCase();
    if (updateObj.resource) updateObj.resource = updateObj.resource.toUpperCase();
    if (updateObj.action) updateObj.action = updateObj.action.toUpperCase();
    
    return await Permission.findByIdAndUpdate(id, updateObj, { new: true });
  }

  /**
   * Soft delete permission
   */
  static async softDelete(id) {
    return await Permission.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  /**
   * Get permissions assigned to a role
   */
  static async getPermissionsByRole(roleId) {
    return await RolePermission.findActivePermissionsForRole(roleId);
  }

  /**
   * Check if permission is assigned to any active roles
   */
  static async isPermissionInUse(permissionId) {
    const count = await RolePermission.countDocuments({
      permissionId,
      isActive: true
    });
    return count > 0;
  }

  /**
   * Get all unique resources
   */
  static async getUniqueResources() {
    const resources = await Permission.distinct('resource', { isActive: true });
    return resources.sort();
  }

  /**
   * Get all unique actions
   */
  static async getUniqueActions() {
    const actions = await Permission.distinct('action', { isActive: true });
    return actions.sort();
  }

  /**
   * Create multiple permissions in bulk
   */
  static async createBulk(permissionsData) {
    const permissions = permissionsData.map(data => ({
      ...data,
      name: data.name.toUpperCase(),
      resource: data.resource.toUpperCase(),
      action: data.action.toUpperCase()
    }));

    return await Permission.insertMany(permissions);
  }

  /**
   * Get permissions statistics
   */
  static async getStatistics() {
    const stats = await Permission.aggregate([
      {
        $group: {
          _id: '$resource',
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return stats;
  }
}

module.exports = PermissionService;
