const express = require('express');
const usersController = require('./users.controller');
const { authenticate, authorizeRoles, authorizeSelfOrAdmin } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const {
  createUserValidation,
  updateUserValidation,
  getUsersValidation,
  userIdValidation,
} = require('./users.validation');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// Apply authentication to all routes
router.use(authenticate);

// User management routes - Admin only

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [superadmin, school_admin, teacher, accountant, parent, student]
 *                 example: teacher
 *               schoolId:
 *                 type: string
 *                 description: School ID (required for non-superadmin roles)
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or user already exists
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  createUserValidation, 
  validate, 
  usersController.createUser
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get users list with pagination and filtering
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [superadmin, school_admin, teacher, accountant, parent, student]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  getUsersValidation, 
  validate, 
  usersController.getUsers
);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by name or email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search query is required
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/search', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  usersController.searchUsers
);

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/stats', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  usersController.getUserStats
);

/**
 * @swagger
 * /users/bulk-update:
 *   post:
 *     summary: Update multiple users at once
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - updateData
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to update
 *               updateData:
 *                 type: object
 *                 description: Data to update for all users
 *     responses:
 *       200:
 *         description: Users updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/bulk-update', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
    body('updateData').isObject().withMessage('Update data object is required'),
    validate
  ],
  usersController.bulkUpdateUsers
);

// Individual user routes

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/:userId', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER'),
  userIdValidation,
  validate,
  usersController.getUserById
);

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [superadmin, school_admin, teacher, accountant, parent, student]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.put('/:userId', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  updateUserValidation, 
  validate,
  usersController.updateUser
);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Soft delete user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.delete('/:userId', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  userIdValidation,
  validate,
  usersController.deleteUser
);

/**
 * @swagger
 * /users/{userId}/hard:
 *   delete:
 *     summary: Hard delete user by ID (superadmin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User permanently deleted
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - superadmin only
 */
router.delete('/:userId/hard', 
  authorizeRoles('SUPER_ADMIN'),
  userIdValidation,
  validate,
  usersController.hardDeleteUser
);

/**
 * @swagger
 * /users/{userId}/status:
 *   patch:
 *     summary: Toggle user active status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: User active status
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.patch('/:userId/status', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  userIdValidation,
  [
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    validate
  ],
  usersController.toggleUserStatus
);

/**
 * @swagger
 * /users/{userId}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password for the user
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.post('/:userId/reset-password', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  userIdValidation,
  [
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    validate
  ],
  usersController.resetUserPassword
);

// Role-based user listing

/**
 * @swagger
 * /users/role/{role}:
 *   get:
 *     summary: Get users by role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [superadmin, school_admin, teacher, accountant, parent, student]
 *         description: User role to filter by
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       400:
 *         description: Invalid role
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/role/:role', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER'),
  [
    body('role').isIn(['superadmin', 'ORG_ADMIN', 'VOLUNTEER', 'accountant', 'parent', 'student']).withMessage('Invalid role'),
    validate
  ],
  usersController.getUsersByRole
);

// Self-service routes (users can access their own data)

/**
 * @swagger
 * /users/me/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me/profile', 
  usersController.getProfile
);

/**
 * @swagger
 * /users/me/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/me/profile', 
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
    validate
  ],
  usersController.updateProfile
);

module.exports = router;
