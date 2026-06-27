const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const createPermission = [
  body('name')
    .notEmpty()
    .withMessage('Permission name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Permission name must be between 3 and 100 characters')
    .matches(/^[A-Z_]+$/)
    .withMessage('Permission name must contain only uppercase letters and underscores'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters'),
  
  body('resource')
    .notEmpty()
    .withMessage('Resource is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Resource must be between 2 and 50 characters')
    .matches(/^[A-Z_]+$/)
    .withMessage('Resource must contain only uppercase letters and underscores'),
  
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
    .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),

  handleValidationErrors
];

const updatePermission = [
  param('id')
    .isMongoId()
    .withMessage('Invalid permission ID'),
  
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Permission name must be between 3 and 100 characters')
    .matches(/^[A-Z_]+$/)
    .withMessage('Permission name must contain only uppercase letters and underscores'),
  
  body('description')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters'),
  
  body('resource')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Resource must be between 2 and 50 characters')
    .matches(/^[A-Z_]+$/)
    .withMessage('Resource must contain only uppercase letters and underscores'),
  
  body('action')
    .optional()
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
    .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  handleValidationErrors
];

const getPermissionById = [
  param('id')
    .isMongoId()
    .withMessage('Invalid permission ID'),

  handleValidationErrors
];

const deletePermission = [
  param('id')
    .isMongoId()
    .withMessage('Invalid permission ID'),

  handleValidationErrors
];

const getPermissions = [
  query('resource')
    .optional()
    .matches(/^[A-Z_]+$/)
    .withMessage('Resource must contain only uppercase letters and underscores'),
  
  query('action')
    .optional()
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
    .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  handleValidationErrors
];

const getPermissionsByRole = [
  param('roleId')
    .isMongoId()
    .withMessage('Invalid role ID'),

  handleValidationErrors
];

module.exports = {
  createPermission,
  updatePermission,
  getPermissionById,
  deletePermission,
  getPermissions,
  getPermissionsByRole
};
