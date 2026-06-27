const express = require('express');
const {
  createInvoice,
  getInvoices,
  recordPayment,
  getPayments
} = require('./finance.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Finance
 *   description: Invoices and Payments management endpoints
 */

/**
 * @swagger
 * /api/v1/finance/invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: List of invoices
 *   post:
 *     summary: Create a new invoice
 *     tags: [Finance]
 *     responses:
 *       201:
 *         description: Created invoice
 */
router
  .route('/invoices')
  .get(getInvoices)
  .post(createInvoice);

/**
 * @swagger
 * /api/v1/finance/payments:
 *   get:
 *     summary: Get all payments
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: List of payments
 *   post:
 *     summary: Record a new payment
 *     tags: [Finance]
 *     responses:
 *       201:
 *         description: Recorded payment
 */
router
  .route('/payments')
  .get(getPayments)
  .post(recordPayment);

module.exports = router;
