const express = require('express');
const {
  createLead,
  getLeads,
  getLead,
  updateLead,
  addFollowup
} = require('./leads.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Leads
 *   description: Lead management endpoints
 */

/**
 * @swagger
 * /api/v1/leads:
 *   get:
 *     summary: Get all leads
 *     tags: [Leads]
 *     responses:
 *       200:
 *         description: List of leads
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     responses:
 *       201:
 *         description: Created lead
 */
router
  .route('/')
  .get(getLeads)
  .post(createLead);

/**
 * @swagger
 * /api/v1/leads/{id}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead details
 *   put:
 *     summary: Update a lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated lead
 */
router
  .route('/:id')
  .get(getLead)
  .put(updateLead);

/**
 * @swagger
 * /api/v1/leads/{id}/followups:
 *   post:
 *     summary: Add a followup to a lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead with new followup
 */
router.post('/:id/followups', addFollowup);

module.exports = router;
