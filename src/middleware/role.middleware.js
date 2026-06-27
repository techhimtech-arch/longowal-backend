const logger = require('../config/logger');
const { sendForbidden, sendUnauthorized } = require('../utils/response');

/**
 * Role-based access control middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method
      });

      return sendForbidden(res, 'Insufficient permissions');
    }

    logger.info('Role-based access granted', {
      userId: req.user.userId,
      userRole: req.user.role,
      path: req.path,
      method: req.method
    });

    next();
  };
};

/**
 * Permission-based access control middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // This would typically check against a permissions system
    // For now, we'll implement basic role-based permission mapping
    const rolePermissions = {
      superadmin: ['*'], // All permissions
      school_admin: ['users.read', 'users.write', 'roles.read'],
      teacher: ['students.read', 'grades.write'],
      student: ['profile.read']
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
      logger.warn('Access denied - insufficient permission', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredPermission: permission,
        userPermissions,
        path: req.path,
        method: req.method
      });

      return sendForbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Self-access or admin middleware
 * Allows users to access their own resources or admins to access any
 */
const requireSelfOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const resourceUserId = req.params[userIdParam] || req.params.id;
    const isOwner = req.user.userId.toString() === resourceUserId;
    const isAdmin = ['superadmin', 'school_admin'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      logger.warn('Access denied - self or admin required', {
        userId: req.user.userId,
        userRole: req.user.role,
        resourceUserId,
        isOwner,
        isAdmin,
        path: req.path,
        method: req.method
      });

      return sendForbidden(res, 'You can only access your own resources');
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireSelfOrAdmin
};
