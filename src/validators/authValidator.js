const { check, validationResult } = require('express-validator');

// Validation result handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Register school validation
const validateRegister = [
  check('schoolName')
    .notEmpty().withMessage('School name is required')
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('School name must be between 2-200 characters'),
  
  check('schoolEmail')
    .notEmpty().withMessage('School email is required')
    .isEmail().withMessage('Invalid school email format')
    .normalizeEmail(),
  
  check('adminName')
    .notEmpty().withMessage('Admin name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Admin name must be between 2-100 characters'),
  
  check('adminEmail')
    .notEmpty().withMessage('Admin email is required')
    .isEmail().withMessage('Invalid admin email format')
    .normalizeEmail(),
  
  check('adminPassword')
    .notEmpty().withMessage('Admin password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('Password must contain at least one letter and one number'),
  
  handleValidation,
];

// Login validation
const validateLogin = [
  check('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  check('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidation,
];

module.exports = { validateRegister, validateLogin };
