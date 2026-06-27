const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validations, handleValidationErrors } = require('../middleware/validationMiddleware');

/**
 * @desc    Create new user
 * @route    POST /api/v1/users
 * @access   Private/School Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, schoolId } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      schoolId: schoolId || req.user.schoolId
    });

    // Remove password from response
    user.password = undefined;

    logger.info('User created successfully', {
      userId: user._id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });

  } catch (error) {
    logger.error('Failed to create user', {
      error: error.message,
      email,
      role,
      schoolId: schoolId || req.user.schoolId,
      createdBy: req.user._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

/**
 * @desc    Get all users (with pagination and filtering)
 * @route    GET /api/v1/users
 * @access   Private/School Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, schoolId } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      schoolId: schoolId || req.user.schoolId
    };

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to get users', {
      error: error.message,
      schoolId: req.user.schoolId,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
});

/**
 * @desc    Get user by ID
 * @route    GET /api/v1/users/:id
 * @access   Private/School Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('schoolId', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user belongs to the same school
    if (user.schoolId._id.toString() !== req.user.schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error('Failed to get user by ID', {
      error: error.message,
      userId: req.params.id,
      schoolId: req.user.schoolId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

/**
 * @desc    Update user
 * @route    PUT /api/v1/users/:id
 * @access   Private/School Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user belongs to the same school
    if (user.schoolId.toString() !== req.user.schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if email is being changed and if it's already taken
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Update user fields
    const allowedUpdates = ['firstName', 'lastName', 'email', 'role'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    logger.info('User updated successfully', {
      userId: updatedUser._id,
      updatedFields: Object.keys(updates),
      updatedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    logger.error('Failed to update user', {
      error: error.message,
      userId: req.params.id,
      schoolId: req.user.schoolId,
      updatedBy: req.user._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

/**
 * @desc    Delete user
 * @route    DELETE /api/v1/users/:id
 * @access   Private/School Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user belongs to the same school
    if (user.schoolId.toString() !== req.user.schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Prevent deletion of the current user
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    logger.info('User deleted successfully', {
      userId: user._id,
      email: user.email,
      role: user.role,
      deletedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete user', {
      error: error.message,
      userId: req.params.id,
      schoolId: req.user.schoolId,
      deletedBy: req.user._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

/**
 * @desc    Get user statistics
 * @route    GET /api/v1/users/stats
 * @access   Private/School Admin
 */
const getUserStats = asyncHandler(async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const stats = await User.aggregate([
      { $match: { schoolId: mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: '$count' },
          roleBreakdown: {
            $push: {
              role: '$_id',
              count: '$count'
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsers: 0,
      roleBreakdown: []
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get user statistics', {
      error: error.message,
      schoolId: req.user.schoolId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: error.message
    });
  }
});

module.exports = {
  createUser: [validations.createUser, handleValidationErrors, createUser],
  getUsers: [validations.pagination, handleValidationErrors, getUsers],
  getUserById: [validations.commonValidations.objectId('id'), handleValidationErrors, getUserById],
  updateUser: [
    validations.commonValidations.objectId('id'),
    validations.updateUser,
    handleValidationErrors,
    updateUser
  ],
  deleteUser: [validations.commonValidations.objectId('id'), handleValidationErrors, deleteUser],
  getUserStats
};
