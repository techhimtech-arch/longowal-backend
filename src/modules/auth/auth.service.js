const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../../models/User');
const RefreshToken = require('../../models/RefreshToken');
const LoginAudit = require('../../models/LoginAudit');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { hashPassword, comparePassword } = require('../../utils/password');
const logger = require('../../config/logger');
const config = require('../../config/env');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData, requestInfo = {}) {
    const { firstName, lastName, email, passwordHash, roleId, schoolId } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash, // Will be hashed by pre-save middleware
      roleId,
      schoolId,
    });

    await user.save();

    // Get user with role for response
    const userWithRole = await User.findById(user._id).populate({ path: 'roleId', strictPopulate: false });

    // Log registration
    await LoginAudit.logLoginAttempt({
      userId: user._id,
      email: user.email,
      role: userWithRole.roleId.name,
      schoolId: user.schoolId,
      action: 'login_success',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true,
    });

    logger.info('User registered successfully', {
      userId: user._id,
      email: user.email,
      role: userWithRole.roleId.name,
    });

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: userWithRole.roleId.name,
        roleId: user.roleId,
        schoolId: user.schoolId,
        isActive: user.isActive,
      },
    };
  }

  /**
   * User login
   */
  async login(email, password, requestInfo = {}) {
    // Find user with role
    const user = await User.findByEmailWithRole(email);
    if (!user) {
      await this.logFailedLogin(email, 'invalid_credentials', requestInfo);
      throw new Error('Invalid credentials');
    }

    // Check if user is active (Map status to isActive for the logic)
    const isActive = user.status === 'ACTIVE' || user.isActive;
    if (!isActive) {
      await this.logFailedLogin(email, 'account_deactivated', requestInfo);
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await this.logFailedLogin(email, 'invalid_credentials', requestInfo);
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date(); // Or user.lastLogin if keeping legacy
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), lastLogin: new Date() } });

    // Determine role name (fallback to userType if roleId doesn't exist)
    const roleName = user.roleId && user.roleId.name ? user.roleId.name : (user.userType === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : (user.userType ? user.userType.toLowerCase() : 'user'));
    const actualRoleId = user.roleId ? (user.roleId._id || user.roleId) : null;

    // Generate tokens
    const tokenFamily = uuidv4();
    const payload = {
      userId: user._id,
      email: user.email,
      role: roleName,
      roleId: actualRoleId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({
      ...payload,
      family: tokenFamily,
    });

    // Store refresh token in database
    const refreshTokenDoc = new RefreshToken({
      token: refreshToken,
      userId: user._id,
      schoolId: user.schoolId || user.organizationId || null, // Allow null for superadmin
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      family: tokenFamily,
      userAgent: requestInfo.userAgent,
      ipAddress: requestInfo.ipAddress,
    });

    await refreshTokenDoc.save();

    // Log successful login
    await LoginAudit.logLoginAttempt({
      userId: user._id,
      email: user.email,
      role: roleName,
      schoolId: user.schoolId || user.organizationId,
      action: 'login_success',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true,
      sessionId: refreshTokenDoc._id,
      tokenFamily,
    });

    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email,
      role: roleName,
      ipAddress: requestInfo.ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: roleName,
        roleId: actualRoleId,
        schoolId: user.schoolId || user.organizationId,
        lastLogin: user.lastLoginAt || user.lastLogin,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken, requestInfo = {}) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find refresh token in database
    const tokenDoc = await RefreshToken.findValidToken(refreshToken);
    if (!tokenDoc) {
      throw new Error('Invalid or expired refresh token');
    }

    // Find user with role
    const user = await User.findById(decoded.userId).populate({ path: 'roleId', strictPopulate: false });
    const isActive = user && (user.status === 'ACTIVE' || user.isActive || user.status === 'Active'); if (!user || !isActive) {
      // Revoke the token family for security
      await RefreshToken.revokeFamily(decoded.family, 'security');
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const newPayload = {
      userId: user._id,
      email: user.email,
      role: user.roleId?.name || (user.userType === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'user'),
      roleId: user.roleId?._id || user.roleId,
      organizationId: user.organizationId,
      userType: user.userType,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken({
      ...newPayload,
      family: decoded.family, // Keep same family
    });

    // Revoke old refresh token
    await tokenDoc.revoke('token_rotation');

    // Store new refresh token
    const newTokenDoc = new RefreshToken({
      token: newRefreshToken,
      userId: user._id,
      schoolId: user.schoolId || null, // Allow null for superadmin
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      family: decoded.family,
      userAgent: requestInfo.userAgent,
      ipAddress: requestInfo.ipAddress,
    });

    await newTokenDoc.save();

    // Log token refresh
    await LoginAudit.logLoginAttempt({
      userId: user._id,
      email: user.email,
      role: user.roleId?.name || (user.userType === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'user'),
      schoolId: user.schoolId,
      action: 'token_refresh',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true,
      sessionId: newTokenDoc._id,
      tokenFamily: decoded.family,
    });

    logger.info('Token refreshed successfully', {
      userId: user._id,
      email: user.email,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(refreshToken, requestInfo = {}) {
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        
        if (tokenDoc) {
          await tokenDoc.revoke('logout');
          
          // Log logout
          await LoginAudit.logLoginAttempt({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            action: 'logout',
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            success: true,
            tokenFamily: decoded.family,
          });
          
          logger.info('User logged out successfully', {
            userId: decoded.userId,
            email: decoded.email,
          });
        }
      } catch (error) {
        logger.warn('Error during logout', { error: error.message });
      }
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId, requestInfo = {}) {
    const user = await User.findById(userId).populate({ path: 'roleId', strictPopulate: false });
    if (!user) {
      throw new Error('User not found');
    }

    // Revoke all user tokens
    await RefreshToken.revokeAllUserTokens(userId, 'logout');

    // Log logout from all devices
    await LoginAudit.logLoginAttempt({
      userId,
      email: user.email,
      role: user.roleId.name,
      schoolId: user.schoolId,
      action: 'logout',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: true,
    });

    logger.info('User logged out from all devices', {
      userId,
      email: user.email,
    });
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId) {
    const sessions = await RefreshToken.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return sessions.map(session => ({
      sessionId: session._id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId, userId) {
    const session = await RefreshToken.findOne({
      _id: sessionId,
      userId,
      isRevoked: false,
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await session.revoke('logout');
    logger.info('Session revoked', { sessionId, userId });
  }

  /**
   * Helper method to log failed login attempts
   */
  async logFailedLogin(email, reason, requestInfo) {
    await LoginAudit.logLoginAttempt({
      userId: null,
      email,
      role: null,
      action: 'login_failed',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success: false,
      failureReason: reason,
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If an account with that email exists, a password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // TODO: Send email with reset token
    logger.info('Password reset requested', {
      userId: user._id,
      email: user.email,
    });

    return { message: 'Password reset link sent to your email' };
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password (will be hashed by pre-save middleware)
    user.passwordHash = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all user tokens for security
    await RefreshToken.revokeAllUserTokens(user._id, 'security');

    // Get user role for logging
    const userWithRole = await User.findById(user._id).populate({ path: 'roleId', strictPopulate: false });

    // Log password reset
    await LoginAudit.logLoginAttempt({
      userId: user._id,
      email: user.email,
      role: userWithRole.roleId.name,
      schoolId: user.schoolId,
      action: 'password_reset',
      ipAddress: null,
      userAgent: null,
      success: true,
    });

    logger.info('Password reset successful', {
      userId: user._id,
      email: user.email,
    });

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
