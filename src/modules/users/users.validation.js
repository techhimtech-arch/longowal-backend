const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			message: 'Validation failed',
			errors: errors.array(),
		});
	}
	next();
};

const createUserValidation = [
	body('firstName')
		.optional()
		.isString()
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('First name must be between 2 and 50 characters'),
	body('lastName')
		.optional()
		.isString()
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('Last name must be between 2 and 50 characters'),
	body('name')
		.optional()
		.isString()
		.trim()
		.isLength({ min: 2, max: 100 })
		.withMessage('Name must be between 2 and 100 characters'),
	body('email')
		.notEmpty()
		.withMessage('Email is required')
		.isEmail()
		.withMessage('Valid email is required')
		.normalizeEmail(),
	body('password')
		.notEmpty()
		.withMessage('Password is required')
		.isLength({ min: 8 })
		.withMessage('Password must be at least 8 characters long'),
	body('role').optional().isString(),
	body('userType').optional().isString(),
	body().custom((value) => {
		const hasName = typeof value?.name === 'string' && value.name.trim().length > 0;
		const hasFirstLast = typeof value?.firstName === 'string' && value.firstName.trim().length > 0 && typeof value?.lastName === 'string' && value.lastName.trim().length > 0;
		const hasRole = typeof value?.role === 'string' && value.role.trim().length > 0;
		const hasUserType = typeof value?.userType === 'string' && value.userType.trim().length > 0;

		if (!hasName && !hasFirstLast) {
			throw new Error('Either name or firstName/lastName is required');
		}

		if (!hasRole && !hasUserType) {
			throw new Error('Role is required');
		}

		return true;
	}),
	handleValidationErrors,
];

const updateUserValidation = [
	param('userId')
		.optional()
		.isMongoId()
		.withMessage('Invalid user ID'),
	body('firstName')
		.optional()
		.isLength({ min: 2, max: 50 })
		.withMessage('First name must be between 2 and 50 characters'),
	body('lastName')
		.optional()
		.isLength({ min: 2, max: 50 })
		.withMessage('Last name must be between 2 and 50 characters'),
	body('email')
		.optional()
		.isEmail()
		.withMessage('Valid email is required')
		.normalizeEmail(),
	body('role')
		.optional()
		.isString(),
	body('isActive')
		.optional()
		.isBoolean()
		.withMessage('isActive must be a boolean'),
	handleValidationErrors,
];

const getUsersValidation = [
	query('page').optional().isInt({ min: 1 }).withMessage('Page must be an integer >= 1'),
	query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be an integer >= 1'),
	query('role').optional().isString(),
	query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
	handleValidationErrors,
];

const userIdValidation = [
	param('userId')
		.isMongoId()
		.withMessage('Invalid user ID'),
	handleValidationErrors,
];

module.exports = {
	createUserValidation,
	updateUserValidation,
	getUsersValidation,
	userIdValidation,
};
