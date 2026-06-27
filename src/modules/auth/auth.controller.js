const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/error.middleware');
const logger = require('../../config/logger');

class AuthController {
  /**
   * Register a new user
   */
  register = asyncHandler(async (req, res) => {
    const requestInfo = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.register(req.body, requestInfo);

    return sendSuccess(res, 201, 'User registered successfully', result.user);
  });

  /**
   * User login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const requestInfo = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.login(email, password, requestInfo);

    return sendSuccess(res, 200, 'Login successful', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  });

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const requestInfo = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.refreshAccessToken(refreshToken, requestInfo);

    return sendSuccess(res, 200, 'Token refreshed successfully', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  });

  /**
   * Logout user
   */
  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const requestInfo = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    await authService.logout(refreshToken, requestInfo);

    return sendSuccess(res, 200, 'Logged out successfully');
  });

  /**
   * Logout from all devices
   */
  logoutAll = asyncHandler(async (req, res) => {
    const requestInfo = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    await authService.logoutAll(req.user.userId, requestInfo);

    return sendSuccess(res, 200, 'Logged out from all devices');
  });

  /**
   * Get active sessions
   */
  getActiveSessions = asyncHandler(async (req, res) => {
    const sessions = await authService.getActiveSessions(req.user.userId);

    return sendSuccess(res, 200, 'Active sessions retrieved', sessions);
  });

  /**
   * Revoke a specific session
   */
  revokeSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    await authService.revokeSession(sessionId, req.user.userId);

    return sendSuccess(res, 200, 'Session revoked successfully');
  });

  /**
   * Request password reset
   */
  requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);

    return sendSuccess(res, 200, result.message);
  });

  /**
   * Reset password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);

    return sendSuccess(res, 200, result.message);
  });

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const User = require('../../models/User');
    const user = await User.findById(req.user.userId).populate('roleId').select('-passwordHash');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, 'Profile retrieved', {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roleId.name,
      roleId: user.roleId._id,
      schoolId: user.schoolId,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const User = require('../../models/User');
    const { firstName, lastName, email } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendError(res, 409, 'Email already exists');
      }
      user.email = email;
    }

    if (firstName) {
      user.firstName = firstName;
    }

    if (lastName) {
      user.lastName = lastName;
    }

    await user.save();

    logger.info('User profile updated', {
      userId: user._id,
      email: user.email,
    });

    return sendSuccess(res, 200, 'Profile updated successfully', {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      updatedAt: user.updatedAt,
    });
  });

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req, res) => {
    const User = require('../../models/User');
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    // Update password (will be hashed by pre-save middleware)
    user.passwordHash = newPassword;
    await user.save();

    // Revoke all tokens for security
    const RefreshToken = require('../../models/RefreshToken');
    await RefreshToken.revokeAllUserTokens(user._id, 'security');

    logger.info('Password changed successfully', {
      userId: user._id,
      email: user.email,
    });

    return sendSuccess(res, 200, 'Password changed successfully');
  });
}

module.exports = new AuthController();
