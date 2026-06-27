const express = require('express');
const {
  createFirm,
  getFirms,
  getFirm,
  updateFirm
} = require('./firms.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Firms
 *   description: Firm management endpoints
 */

/**
 * @swagger
 * /api/v1/firms:
 *   get:
 *     summary: Get all firms
 *     tags: [Firms]
 *     responses:
 *       200:
 *         description: List of firms
 *   post:
 *     summary: Create a new firm
 *     tags: [Firms]
 *     responses:
 *       201:
 *         description: Created firm
 */
router
  .route('/')
  .get(getFirms)
  .post(createFirm);

/**
 * @swagger
 * /api/v1/firms/{id}:
 *   get:
 *     summary: Get firm by ID
 *     tags: [Firms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Firm details
 *   put:
 *     summary: Update a firm
 *     tags: [Firms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated firm
 */
router
  .route('/:id')
  .get(getFirm)
  .put(updateFirm);

module.exports = router;
