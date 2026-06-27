const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { sendUnauthorized, sendForbidden } = require('../utils/response');
const logger = require('../config/logger');
const User = require('../models/User');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return sendUnauthorized(res, 'Access token is required');
    }

    const decoded = verifyAccessToken(token);
    
    // Find user by ID and conditionally populate avoiding Mongoose crash
    // if roleId was missing from newer schema definitions
    // using strictPopulate: false as requested
    const user = await User.findById(decoded.userId).populate({ path: 'roleId', strictPopulate: false }).select('-passwordHash');
    
    if (!user) {
      return sendUnauthorized(res, 'User not found');
    }

    const isActive = user.status === 'ACTIVE' || user.isActive;
    if (!isActive) {
      return sendUnauthorized(res, 'User account is deactivated');
    }

    // Determine role name avoiding null references
    let roleName = user.roleId && user.roleId.name ? user.roleId.name : '';
    if (!roleName) {
         roleName = user.userType === 'SUPER_ADMIN' ? 'superadmin' : (user.userType ? user.userType.toLowerCase().replace('_', '') : 'user');
    }
    const actualRoleId = user.roleId ? (user.roleId._id || user.roleId) : null;

    // Attach user to request object
    req.user = {
      _id: user._id,         // Keep _id for backward compat with controllers
      userId: user._id,      // Also expose as userId
      email: user.email,
      role: roleName,
      roleId: actualRoleId,
      organizationId: user.organizationId,
      userType: user.userType,
      schoolId: user.schoolId || user.organizationId,
    };

    logger.info('User authenticated successfully', {
      userId: user._id,
      email: user.email,
      role: roleName,
    });

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    
    if (error.message.includes('expired')) {
      return sendUnauthorized(res, 'Token expired');
    } else if (error.message.includes('invalid')) {
      return sendUnauthorized(res, 'Invalid token');
    }
    
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Array of allowed roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });

      return sendForbidden(res, 'Insufficient permissions');
    }

    logger.info('User authorized', {
      userId: req.user.userId,
      role: req.user.role,
      path: req.path,
      method: req.method,
    });

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).populate({ path: 'roleId', strictPopulate: false }).select('-passwordHash');
      
      const isActive = user && (user.status === 'ACTIVE' || user.isActive);
      if (user && isActive) {
        const roleName = user.roleId && user.roleId.name ? user.roleId.name : (user.userType === 'SUPER_ADMIN' ? 'superadmin' : (user.userType ? user.userType.toLowerCase() : 'user'));
        const actualRoleId = user.roleId ? (user.roleId._id || user.roleId) : null;
        
        req.user = {
          _id: user._id,
          userId: user._id,
          email: user.email,
          role: roleName,
          roleId: actualRoleId,
          organizationId: user.organizationId,
          userType: user.userType,
          schoolId: user.schoolId || user.organizationId,
        };
      }
    }
    
    next();
  } catch (error) {
    // Optional auth should not fail the request
    logger.debug('Optional authentication failed', { error: error.message });
    next();
  }
};

/**
 * Check if user can access their own resource or has admin role
 */
const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const resourceUserId = req.params.userId || req.params.id;
  const isOwner = req.user.userId.toString() === resourceUserId;
  const isAdmin = ['superadmin', 'school_admin'].includes(req.user.role);

  if (!isOwner && !isAdmin) {
    return sendForbidden(res, 'You can only access your own resources');
  }

  next();
};

module.exports = {
  authenticate,
  authorizeRoles,
  optionalAuth,
  authorizeSelfOrAdmin,
};
