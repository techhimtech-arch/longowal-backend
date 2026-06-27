const { body, query, param, validationResult } = require('express-validator');
const { customValidations } = require('../../middleware/validation.middleware');

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

const createUserValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .custom((value) => {
      if (!customValidations.isStrongPassword(value)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      }
      return true;
    }),
  
  body('userType')
    .optional()
    .isIn(['SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER', 'CITIZEN'])
    .withMessage('Valid user type is required'),
    
  body('organizationId')
    .optional()
    .isMongoId()
    .withMessage('Organization ID must be a valid MongoID'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),
  
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  
  body('schoolId')
    .optional()
    .isMongoId()
    .withMessage('Invalid school ID'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'SUSPENDED', 'DELETED', 'INACTIVE'])
    .withMessage('Status must be one of: ACTIVE, SUSPENDED, DELETED, INACTIVE'),
  
  handleValidationErrors
];

const updateUserValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phoneNumber')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),
  
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  
  body('userType')
    .optional()
    .isIn(['SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER', 'CITIZEN'])
    .withMessage('Invalid user type'),
  
  body('organizationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid organization ID'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'SUSPENDED', 'DELETED', 'INACTIVE'])
    .withMessage('Status must be one of: ACTIVE, SUSPENDED, DELETED, INACTIVE'),
  
  handleValidationErrors
];

const getUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('userType')
    .optional()
    .isIn(['SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER', 'CITIZEN'])
    .withMessage('Invalid user type filter'),

  query('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER', 'CITIZEN'])
    .withMessage('Invalid role filter'),

  query('isActive')
    .optional()
    .isIn(['true', 'false', true, false])
    .withMessage('isActive filter must be a boolean'),
  
  query('status')
    .optional()
    .isIn(['ACTIVE', 'SUSPENDED', 'DELETED', 'INACTIVE'])
    .withMessage('Status filter must be one of: ACTIVE, SUSPENDED, DELETED, INACTIVE'),
  
  query('organizationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid organization ID'),
  
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  handleValidationErrors
];

const assignRoleValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('roleId')
    .isMongoId()
    .withMessage('Valid role ID is required'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('expiresAt must be a valid date'),
  
  handleValidationErrors
];

const removeRoleValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('roleId')
    .isMongoId()
    .withMessage('Valid role ID is required'),
  
  handleValidationErrors
];

const userIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  handleValidationErrors
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  getUsersValidation,
  userIdValidation,
  assignRoleValidation,
  removeRoleValidation,
};
