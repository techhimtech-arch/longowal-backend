const usersService = require('./users.service');
const { sendSuccess, sendError, sendNotFound, sendPaginatedResponse } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/error.middleware');
const logger = require('../../config/logger');

class UsersController {
  /**
   * Create a new user
   */
  createUser = asyncHandler(async (req, res) => {
    const result = await usersService.createUser(req.body, req.user?.userId);

    return sendSuccess(res, 201, 'User created successfully', result);
  });

  /**
   * Get users with pagination and filtering
   */
  getUsers = asyncHandler(async (req, res) => {
    let status = req.query.status;
    if (req.query.isActive !== undefined) {
      const isActive = req.query.isActive === 'true' || req.query.isActive === true;
      status = isActive ? 'ACTIVE' : 'INACTIVE';
    }

    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      userType: req.query.userType || req.query.role,
      status: status,
      organizationId: req.query.organizationId || req.user?.organizationId,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await usersService.getUsers(filters);

    return sendPaginatedResponse(res, result.users, result.pagination, 'Users retrieved successfully');
  });

  /**
   * Get user by ID
   */
  getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await usersService.getUserById(userId);

    return sendSuccess(res, 200, 'User retrieved successfully', user);
  });

  /**
   * Update user
   */
  updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await usersService.updateUser(userId, req.body, req.user?.userId);

    return sendSuccess(res, 200, 'User updated successfully', user);
  });

  /**
   * Delete user (soft delete)
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await usersService.deleteUser(userId, req.user?.userId);

    return sendSuccess(res, 200, 'User deleted successfully', user);
  });

  /**
   * Hard delete user (permanent deletion)
   */
  hardDeleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const result = await usersService.hardDeleteUser(userId, req.user?.userId);

    return sendSuccess(res, 200, result.message);
  });

  /**
   * Get user statistics
   */
  getUserStats = asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId || req.user?.schoolId;

    const stats = await usersService.getUserStats(schoolId);

    return sendSuccess(res, 200, 'User statistics retrieved', stats);
  });

  /**
   * Search users
   */
  searchUsers = asyncHandler(async (req, res) => {
    const { q: query } = req.query;

    if (!query) {
      return sendError(res, 400, 'Search query is required');
    }

    const options = {
      limit: parseInt(req.query.limit) || 20,
      schoolId: req.query.schoolId || req.user?.schoolId,
      role: req.query.role,
    };

    const users = await usersService.searchUsers(query, options);

    return sendSuccess(res, 200, 'Users found', users);
  });

  /**
   * Bulk update users
   */
  bulkUpdateUsers = asyncHandler(async (req, res) => {
    const { userIds, updateData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return sendError(res, 400, 'User IDs array is required');
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return sendError(res, 400, 'Update data is required');
    }

    const result = await usersService.bulkUpdateUsers(userIds, updateData, req.user?.userId);

    return sendSuccess(res, 200, result.message, { modifiedCount: result.modifiedCount });
  });

  /**
   * Activate/deactivate user
   */
  toggleUserStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendError(res, 400, 'isActive must be a boolean');
    }

    const user = await usersService.updateUser(userId, { isActive }, req.user?.userId);

    const message = isActive ? 'User activated successfully' : 'User deactivated successfully';

    return sendSuccess(res, 200, message, user);
  });

  /**
   * Get users by role
   */
  getUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.params;

    const filters = {
      role,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      schoolId: req.query.schoolId || req.user?.schoolId,
      search: req.query.search,
    };

    const result = await usersService.getUsers(filters);

    return sendPaginatedResponse(res, result.users, result.pagination, `${role} users retrieved successfully`);
  });

  /**
   * Reset user password
   */
  resetUserPassword = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return sendError(res, 400, 'New password is required');
    }

    const { hashPassword, validatePasswordStrength } = require('../../utils/password');
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return sendError(res, 400, 'Password does not meet security requirements', passwordValidation.errors);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    const User = require('../../models/User');
    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Revoke all user tokens for security
    const RefreshToken = require('../../models/RefreshToken');
    await RefreshToken.revokeAllUserTokens(userId, 'security');

    logger.info('User password reset by admin', {
      userId,
      email: user.email,
      adminId: req.user?.userId,
    });

    return sendSuccess(res, 200, 'Password reset successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const User = require('../../models/User');
    
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    return sendSuccess(res, 200, 'Profile retrieved successfully', user);
  });

  /**
   * Update current user profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const User = require('../../models/User');
    const { firstName, lastName, email } = req.body;
    
    // Build update object
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    return sendSuccess(res, 200, 'Profile updated successfully', user);
  });
}

module.exports = new UsersController();
