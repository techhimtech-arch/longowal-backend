const express = require('express');
const rolesController = require('./roles.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role and permission management endpoints
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 */
// Get all roles - accessible to multiple roles
router.get('/', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER'),
  rolesController.getRoles
);

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     summary: Get available permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available permissions retrieved successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 */
// Get available permissions - admin only
router.get('/permissions', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  rolesController.getAvailablePermissions
);

/**
 * @swagger
 * /roles/stats:
 *   get:
 *     summary: Get role statistics
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role statistics retrieved successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 */
// Get role statistics - admin only
router.get('/stats', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN'),
  rolesController.getRoleStats
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: custom_role
 *               description:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: Custom role for specific permissions
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission names
 *                 example: ["read_users", "write_users"]
 *               schoolId:
 *                 type: string
 *                 description: School ID (optional, for school-specific roles)
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation error or role already exists
 *       403:
 *         description: Forbidden - superadmin only
 */
// Create role - superadmin only
router.post('/', 
  authorizeRoles('SUPER_ADMIN'),
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('description').trim().isLength({ min: 5, max: 200 }).withMessage('Description must be between 5 and 200 characters'),
    body('permissions').isArray({ min: 1 }).withMessage('At least one permission is required'),
    body('schoolId').optional().isMongoId().withMessage('Invalid school ID'),
    validate
  ],
  rolesController.createRole
);

// Individual role routes

/**
 * @swagger
 * /roles/{name}:
 *   get:
 *     summary: Get role by name
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/:name', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER'),
  rolesController.getRoleByName
);

/**
 * @swagger
 * /roles/{name}/permissions:
 *   get:
 *     summary: Get role permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 *       404:
 *         description: Role not found
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/:name/permissions', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER'),
  rolesController.getRolePermissions
);

/**
 * @swagger
 * /roles/{name}/permissions/{permission}:
 *   get:
 *     summary: Check if role has specific permission
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name
 *       - in: path
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission name
 *     responses:
 *       200:
 *         description: Permission check result
 *       404:
 *         description: Role not found
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/:name/permissions/:permission', 
  authorizeRoles('SUPER_ADMIN', 'ORG_ADMIN', 'VOLUNTEER'),
  rolesController.checkRolePermission
);

/**
 * @swagger
 * /roles/{name}:
 *   put:
 *     summary: Update role by name
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - superadmin only
 *       404:
 *         description: Role not found
 */
router.put('/:name', 
  authorizeRoles('SUPER_ADMIN'),
  [
    body('description').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Description must be between 5 and 200 characters'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validate
  ],
  rolesController.updateRole
);

/**
 * @swagger
 * /roles/{name}:
 *   delete:
 *     summary: Delete role by name
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       403:
 *         description: Forbidden - superadmin only
 */
router.delete('/:name', 
  authorizeRoles('SUPER_ADMIN'),
  rolesController.deleteRole
);

/**
 * @swagger
 * /roles/{name}/permissions:
 *   post:
 *     summary: Assign permissions to role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission names to assign
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - superadmin only
 *       404:
 *         description: Role not found
 */
router.post('/:name/permissions', 
  authorizeRoles('SUPER_ADMIN'),
  [
    body('permissions').isArray({ min: 1 }).withMessage('At least one permission is required'),
    validate
  ],
  rolesController.assignPermissions
);

module.exports = router;
