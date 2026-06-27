const express = require('express');
const router = express.Router();

const {
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionsByRole
} = require('./permissions.controller');

const { authenticateToken, authorizePermissions } = require('../../middleware/rbac.middleware');
const validate = require('./permissions.validation');

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Permission management and RBAC APIs
 */

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PermissionInput'
 *     responses:
 *       201:
 *         description: Permission created successfully
 */

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission details
 *   put:
 *     summary: Update permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PermissionInput'
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *   delete:
 *     summary: Delete permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 */

/**
 * @swagger
 * /permissions/role/{roleId}:
 *   get:
 *     summary: Get permissions by role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Permissions for the role
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "perm_123"
 *         name:
 *           type: string
 *           example: "CREATE_USER"
 *         description:
 *           type: string
 *           example: "Permission to create new users"
 *         resource:
 *           type: string
 *           example: "USER"
 *         action:
 *           type: string
 *           enum: [CREATE, READ, UPDATE, DELETE, VIEW]
 *           example: "CREATE"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PermissionInput:
 *       type: object
 *       required:
 *         - name
 *         - resource
 *         - action
 *       properties:
 *         name:
 *           type: string
 *           example: "CREATE_USER"
 *         description:
 *           type: string
 *           example: "Permission to create new users"
 *         resource:
 *           type: string
 *           example: "USER"
 *         action:
 *           type: string
 *           enum: [CREATE, READ, UPDATE, DELETE, VIEW]
 *           example: "CREATE"
 */

// Public routes (none for permissions - all require authentication)

// GET /api/permissions - Get all permissions
router.get('/',
  authenticateToken,
  authorizePermissions('VIEW_PERMISSIONS'),
  validate.getPermissions,
  getPermissions
);

// GET /api/permissions/:id - Get permission by ID
router.get('/:id',
  authenticateToken,
  authorizePermissions('VIEW_PERMISSIONS'),
  validate.getPermissionById,
  getPermissionById
);

// POST /api/permissions - Create new permission
router.post('/', 
  authenticateToken,
  authorizePermissions('CREATE_PERMISSION'),
  validate.createPermission,
  createPermission
);

// PUT /api/permissions/:id - Update permission
router.put('/:id', 
  authenticateToken,
  authorizePermissions('UPDATE_PERMISSION'),
  validate.updatePermission,
  updatePermission
);

// DELETE /api/permissions/:id - Delete permission
router.delete('/:id', 
  authenticateToken,
  authorizePermissions('DELETE_PERMISSION'),
  validate.deletePermission,
  deletePermission
);

// GET /api/permissions/role/:roleId - Get permissions for a specific role
router.get('/role/:roleId', 
  authenticateToken,
  authorizePermissions('VIEW_ROLES'),
  validate.getPermissionsByRole,
  getPermissionsByRole
);

module.exports = router;
