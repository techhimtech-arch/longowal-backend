const User = require('../../models/User');
const Role = require('../../models/Role');
const { hashPassword } = require('../../utils/password');
const logger = require('../../config/logger');

class UsersService {
  /**
   * Create a new user
   */
  async createUser(userData, creatorId = null) {
    const { firstName, lastName, email, password, userType, organizationId, status = 'ACTIVE' } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Determine role based on userType
    const roleMapping = {
      'SUPER_ADMIN': 'SUPER_ADMIN',
      'ORG_ADMIN': 'ADMIN',
      'VOLUNTEER': 'USER',
      'CITIZEN': 'USER'
    };
    
    const roleName = roleMapping[userType] || 'USER';
    const role = await Role.findOne({ name: roleName });

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      userType: userType || 'CITIZEN',
      roleId: role ? role._id : null,
      organizationId,
      status: status === 'INACTIVE' ? 'SUSPENDED' : status,
    });

    await user.save();

    logger.info('User created successfully', {
      userId: user._id,
      email: user.email,
      userType: user.userType,
      roleId: user.roleId,
      creatorId,
    });

    return this.formatUserResponse(user);
  }

  /**
   * Get users with pagination and filtering
   */
  async getUsers(filters = {}) {
    const {
      page = 1,
      limit = 10,
      userType,
      status,
      organizationId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = {};

    if (userType) {
      query.userType = userType;
    }

    if (status) {
      query.status = status === 'INACTIVE' ? 'SUSPENDED' : status;
    }

    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('organizationId', 'name');

    const total = await User.countDocuments(query);

    return {
      users: users.map(user => this.formatUserResponse(user)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId).select('-passwordHash').populate('organizationId', 'name');

    if (!user) {
      throw new Error('User not found');
    }

    return this.formatUserResponse(user);
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData, updaterId = null) {
    const { firstName, lastName, email, userType, organizationId, status } = updateData;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        throw new Error('Email already exists');
      }
      user.email = email;
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (userType !== undefined) user.userType = userType;
    if (organizationId !== undefined) user.organizationId = organizationId;
    if (status !== undefined) user.status = status === 'INACTIVE' ? 'SUSPENDED' : status;

    await user.save();

    logger.info('User updated successfully', {
      userId: user._id,
      email: user.email,
      updaterId,
    });

    return this.formatUserResponse(user);
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(userId, deleterId = null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete by updating status
    user.status = 'DELETED';
    await user.save();

    logger.info('User deleted successfully', {
      userId: user._id,
      email: user.email,
      deleterId,
    });

    return this.formatUserResponse(user);
  }

  /**
   * Hard delete user (permanent deletion)
   */
  async hardDeleteUser(userId, deleterId = null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await User.findByIdAndDelete(userId);

    logger.warn('User permanently deleted', {
      userId: user._id,
      email: user.email,
      deleterId,
    });

    return { message: 'User permanently deleted' };
  }

  /**
   * Get user statistics
   */
  async getUserStats(organizationId = null) {
    const matchStage = {};
    if (organizationId) {
      matchStage.organizationId = organizationId;
    }

    const stats = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $ne: ['$status', 'ACTIVE'] }, 1, 0] }
          },
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          activeUsers: 1,
          inactiveUsers: 1,
        }
      }
    ]);

    const roleStats = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
          },
        }
      },
      { $sort: { count: -1 } }
    ]);

    return {
      summary: stats[0] || { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 },
      byRole: roleStats,
    };
  }

  /**
   * Search users
   */
  async searchUsers(query, options = {}) {
    const { limit = 20, organizationId, userType } = options;

    const searchQuery = {
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    };

    if (organizationId) {
      searchQuery.organizationId = organizationId;
    }

    if (userType) {
      searchQuery.userType = userType;
    }

    const users = await User.find(searchQuery)
      .select('-passwordHash')
      .limit(limit)
      .populate('organizationId', 'name');

    return users.map(user => this.formatUserResponse(user));
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(userIds, updateData, updaterId = null) {
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updateData }
    );

    logger.info('Users bulk updated', {
      userIds,
      updateData,
      updaterId,
      modifiedCount: result.modifiedCount,
    });

    return {
      message: 'Users updated successfully',
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Format user response object
   */
  formatUserResponse(user) {
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      organizationId: user.organizationId,
      status: user.status === 'SUSPENDED' ? 'INACTIVE' : user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: user.organizationId || null,
    };
  }
}

module.exports = new UsersService();
