const { validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/response');

/**
 * Validation middleware - checks for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));
    
    return sendValidationError(res, formattedErrors);
  }
  
  next();
};

/**
 * Custom validation rules
 */
const customValidations = {
  /**
   * Validate password strength
   */
  isStrongPassword: (value) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    return value.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },
  
  /**
   * Validate email format
   */
  isValidEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  /**
   * Validate phone number format
   */
  isValidPhone: (value) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
  },
  
  /**
   * Validate MongoDB ObjectId
   */
  isValidObjectId: (value) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(value);
  },
  
  /**
   * Validate date format (YYYY-MM-DD)
   */
  isValidDate: (value) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
  },
  
  /**
   * Validate file size (in bytes)
   */
  isValidFileSize: (fileSize, maxSize) => {
    return fileSize <= maxSize;
  },
  
  /**
   * Validate file type
   */
  isValidFileType: (mimeType, allowedTypes) => {
    return allowedTypes.includes(mimeType);
  },
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS characters
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitized[key] = sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  };
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Rate limiting validation
 */
const validateRateLimit = (maxRequests, windowMs) => {
  return (req, res, next) => {
    // This would typically be handled by a rate limiting library
    // but we can add custom validation here if needed
    next();
  };
};

module.exports = {
  validate,
  customValidations,
  sanitizeInput,
  validateRateLimit,
};
