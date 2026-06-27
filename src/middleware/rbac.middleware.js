const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { sendUnauthorized, sendForbidden } = require('../utils/response');
const logger = require('../config/logger');
const User = require('../models/User');
const UserRole = require('../models/UserRole');
const RolePermission = require('../models/RolePermission');
const Permission = require('../models/Permission');

/**
 * Authentication middleware - verifies JWT token and loads user with roles
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return sendUnauthorized(res, 'Access token is required');
    }

    const decoded = verifyAccessToken(token);
    
    // Find user with user type and roles
    const user = await User.findById(decoded.userId)
      .populate({ path: 'userTypeId', strictPopulate: false })
      .select('-passwordHash');
    
    if (!user) {
      return sendUnauthorized(res, 'User not found');
    }

    if (user.status !== 'ACTIVE' && user.status !== 'Active' && !user.isActive) {
      return sendUnauthorized(res, 'User account is not active');
    }

    // Get user roles
    const userRoles = await UserRole.find({ userId: user._id }).populate('roleId');

    // Get all permissions for user
    const userPermissions = await getUserPermissions(user._id);

    // Attach user to request object
    req.user = {
      userId: user._id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userTypeId: user.userTypeId?._id || null,
      userType: user.userTypeId?.name || user.userType,
      status: user.status,
      schoolId: user.schoolId,
      roles: userRoles.map(ur => ur.roleId),
      permissions: userPermissions
    };

    logger.info('User authenticated successfully', {
      userId: user._id,
      email: user.email,
      userType: user.userTypeId?.name || user.userType,
      rolesCount: userRoles.length,
      permissionsCount: userPermissions.length
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
 * @param {...string} allowedRoles - Array of allowed role names
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const userRoleNames = req.user.roles.map(role => role.name);
    const hasRequiredRole = allowedRoles.some(role => userRoleNames.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Unauthorized access attempt - insufficient role', {
        userId: req.user.userId,
        userRoles: userRoleNames,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });

      return sendForbidden(res, 'Insufficient role permissions');
    }

    logger.info('User authorized by role', {
      userId: req.user.userId,
      roles: userRoleNames,
      path: req.path,
      method: req.method,
    });

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {...string} requiredPermissions - Array of required permission names
 */
const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const userPermissionNames = req.user.permissions.map(p => p.name);
    const hasRequiredPermission = requiredPermissions.some(permission => 
      userPermissionNames.includes(permission)
    );

    if (!hasRequiredPermission) {
      logger.warn('Unauthorized access attempt - insufficient permission', {
        userId: req.user.userId,
        userPermissions: userPermissionNames,
        requiredPermissions,
        path: req.path,
        method: req.method,
      });

      return sendForbidden(res, 'Insufficient permissions');
    }

    logger.info('User authorized by permission', {
      userId: req.user.userId,
      permissions: requiredPermissions,
      path: req.path,
      method: req.method,
    });

    next();
  };
};

/**
 * User type-based authorization middleware
 * @param {...string} allowedUserTypes - Array of allowed user type names
 */
const authorizeUserTypes = (...allowedUserTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!allowedUserTypes.includes(req.user.userType)) {
      logger.warn('Unauthorized access attempt - insufficient user type', {
        userId: req.user.userId,
        userType: req.user.userType,
        requiredUserTypes: allowedUserTypes,
        path: req.path,
        method: req.method,
      });

      return sendForbidden(res, 'Insufficient user type permissions');
    }

    logger.info('User authorized by user type', {
      userId: req.user.userId,
      userType: req.user.userType,
      path: req.path,
      method: req.method,
    });

    next();
  };
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
  const userRoleNames = req.user.roles.map(role => role.name);
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].some(role => userRoleNames.includes(role));

  if (!isOwner && !isAdmin) {
    return sendForbidden(res, 'You can only access your own resources');
  }

  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId)
        .populate({ path: 'userTypeId', strictPopulate: false })
        .select('-passwordHash');
      
      if (user && user.status === 'ACTIVE') {
        const userRoles = await UserRole.find({ userId: user._id }).populate('roleId');      
        
        req.user = {
          userId: user._id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userTypeId: user.userTypeId?._id || null,
          userType: user.userTypeId?.name || user.userType,
          status: user.status,
          schoolId: user.schoolId,
          roles: userRoles.map(ur => ur.roleId),
          permissions: userPermissions
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
 * Helper function to get all permissions for a user
 */
async function getUserPermissions(userId) {
  const userRoles = await UserRole.find({ userId }).populate('roleId');
  const roleIds = userRoles.filter(ur => ur.roleId).map(ur => ur.roleId._id);
  
  const rolePermissions = await RolePermission.find({
    roleId: { $in: roleIds },
    isActive: true
  }).populate('permissionId');
  
  return rolePermissions.map(rp => rp.permissionId);
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermissions,
  authorizeUserTypes,
  authorizeSelfOrAdmin,
  optionalAuth,
};
