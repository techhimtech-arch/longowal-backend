const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const {
  getAuditLogs,
  getAuditLogById,
  getUserActivityLogs,
  getAuditLogStats,
  getActionTypes,
} = require('../controllers/auditLogController');

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: System audit log endpoints
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: success
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authMiddleware,
  roleGuard(['superadmin', 'school_admin']),
  getAuditLogs
);

/**
 * @swagger
 * /audit-logs/stats:
 *   get:
 *     summary: Get audit log statistics
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit statistics
 */
router.get(
  '/stats',
  authMiddleware,
  roleGuard(['superadmin', 'school_admin']),
  getAuditLogStats
);

/**
 * @swagger
 * /audit-logs/actions:
 *   get:
 *     summary: Get available action types for filtering
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of action types
 */
router.get(
  '/actions',
  authMiddleware,
  roleGuard(['superadmin', 'school_admin']),
  getActionTypes
);

/**
 * @swagger
 * /audit-logs/user/{userId}:
 *   get:
 *     summary: Get activity logs for a specific user
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: User activity logs
 */
router.get(
  '/user/:userId',
  authMiddleware,
  roleGuard(['superadmin', 'school_admin']),
  getUserActivityLogs
);

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log details
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authMiddleware,
  roleGuard(['superadmin', 'school_admin']),
  getAuditLogById
);

module.exports = router;
