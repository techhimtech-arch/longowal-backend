const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Render/Node16: uuid@9 is ESM-only, so require('uuid') throws ERR_REQUIRE_ESM.
// We don't actually need uuid here; we only need an unpredictable "family" id.
const uuidv4 = () => crypto.randomUUID();
const School = require('../models/School');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const emailService = require('./emailService');
const { logAuthEvent } = require('../middlewares/auditMiddleware');
const logger = require('../utils/logger');

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Refresh token valid for 7 days

class AuthService {
  /**
   * Register a new school with admin
   */
  async registerSchool(registrationData) {
    const { schoolName, schoolEmail, adminName, adminEmail, adminPassword } = registrationData;

    // Check if school already exists
    const existingSchool = await School.findOne({ email: schoolEmail });
    if (existingSchool) {
      throw { status: 400, message: 'School already exists' };
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      throw { status: 400, message: 'Admin email already registered' };
    }

    // Create School
    const school = new School({ name: schoolName, email: schoolEmail });
    await school.save();

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create Admin User
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'school_admin',
      schoolId: school._id,
    });
    await adminUser.save();

    // Generate JWT
    const token = this.generateToken(adminUser, school._id);

    // Send welcome email (async)
    emailService.sendWelcomeEmail(adminUser, school).catch(err => {
      logger.error('Failed to send welcome email', { error: err.message });
    });

    return { token, school, user: adminUser };
  }

  /**
   * Login user
   */
  async login(email, password, requestInfo = {}) {
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      // Log failed login attempt
      await logAuthEvent({
        action: 'LOGIN_FAILED',
        success: false,
        errorMessage: 'Invalid credentials - user not found',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: { email },
      });
      throw { status: 401, message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Log failed login attempt
      await logAuthEvent({
        action: 'LOGIN_FAILED',
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        schoolId: user.schoolId,
        success: false,
        errorMessage: 'Invalid credentials - wrong password',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      });
      throw { status: 401, message: 'Invalid credentials' };
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user, user.schoolId);
    const { refreshToken, family } = await this.generateRefreshToken(user, user.schoolId, requestInfo);

    // Log successful login
    await logAuthEvent({
      action: 'LOGIN',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      schoolId: user.schoolId,
      success: true,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      }
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, requestInfo = {}) {
    // Find the refresh token
    const storedToken = await RefreshToken.findValidToken(refreshToken);
    
    if (!storedToken) {
      // Check if this is a previously used token (potential theft)
      const usedToken = await RefreshToken.findOne({ token: refreshToken });
      if (usedToken && usedToken.isRevoked) {
        // Token reuse detected - revoke all tokens in the family
        logger.warn('Refresh token reuse detected - revoking token family', {
          family: usedToken.family,
          userId: usedToken.userId,
        });
        await RefreshToken.revokeFamily(usedToken.family, 'security');
      }
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }

    // Get user
    const user = await User.findById(storedToken.userId);
    if (!user || !user.isActive) {
      await storedToken.revoke('security');
      throw { status: 401, message: 'User not found or inactive' };
    }

    // Implement token rotation - revoke old token and issue new one
    await storedToken.revoke('token_rotation');

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user, storedToken.schoolId);
    const { refreshToken: newRefreshToken } = await this.generateRefreshToken(
      user,
      storedToken.schoolId,
      requestInfo,
      storedToken.family // Keep same family for rotation tracking
    );

    // Log token refresh
    await logAuthEvent({
      action: 'TOKEN_REFRESH',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      schoolId: storedToken.schoolId,
      success: true,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken, requestInfo = {}) {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    
    if (storedToken) {
      const userId = storedToken.userId;
      await storedToken.revoke('logout');
      
      // Log logout
      const user = await User.findById(userId);
      if (user) {
        await logAuthEvent({
          action: 'LOGOUT',
          userId: user._id,
          userName: user.name,
          userRole: user.role,
          schoolId: storedToken.schoolId,
          success: true,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
        });
      }
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices - revoke all refresh tokens
   */
  async logoutAll(userId, requestInfo = {}) {
    await RefreshToken.revokeAllUserTokens(userId, 'security');
    
    const user = await User.findById(userId);
    if (user) {
      await logAuthEvent({
        action: 'LOGOUT',
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        schoolId: user.schoolId,
        success: true,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: { logoutAll: true },
      });
    }

    return { message: 'Logged out from all devices' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save to user (you'd need to add these fields to User model)
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user, resetToken);

    return { message: 'If email exists, reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    });

    if (!user) {
      throw { status: 400, message: 'Invalid or expired reset token' };
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { message: 'Password reset successful' };
  }

  /**
   * Generate short-lived access token
   */
  generateAccessToken(user, schoolId) {
    return jwt.sign(
      { 
        userId: user._id, 
        schoolId, 
        role: user.role,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate refresh token and store in database
   */
  async generateRefreshToken(user, schoolId, requestInfo = {}, family = null) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenFamily = family || uuidv4();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshToken = new RefreshToken({
      token,
      userId: user._id,
      schoolId,
      expiresAt,
      family: tokenFamily,
      userAgent: requestInfo.userAgent,
      ipAddress: requestInfo.ipAddress,
    });

    await refreshToken.save();

    return { refreshToken: token, family: tokenFamily };
  }

  /**
   * Generate JWT token (legacy - for backward compatibility)
   * @deprecated Use generateAccessToken and generateRefreshToken instead
   */
  generateToken(user, schoolId) {
    return jwt.sign(
      { 
        userId: user._id, 
        schoolId, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId) {
    const sessions = await RefreshToken.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).select('createdAt userAgent ipAddress');

    return sessions.map(session => ({
      id: session._id,
      createdAt: session.createdAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId, userId) {
    const session = await RefreshToken.findOne({
      _id: sessionId,
      userId,
      isRevoked: false,
    });

    if (!session) {
      throw { status: 404, message: 'Session not found' };
    }

    await session.revoke('admin_action');
    return { message: 'Session revoked successfully' };
  }
}

module.exports = new AuthService();
