const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Create a new user (teacher or accountant)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    if (role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot create superadmin role.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      schoolId: req.user.schoolId, // Assign schoolId from logged-in user
    });

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get all users of the same school
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ schoolId: req.user.schoolId }).select('-password');
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Toggle user status (activate/deactivate)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user and ensure they belong to the same school
    const user = await User.findOne({ _id: id, schoolId: req.user.schoolId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or unauthorized.',
      });
    }

    // Toggle isActive status
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  toggleUserStatus,
};
