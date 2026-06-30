const express = require('express');
const router = express.Router();

// Import core v1 routes
router.use('/auth', require('../../modules/auth/auth.routes'));
router.use('/users', require('../../modules/users/users.routes'));
router.use('/roles', require('../../modules/roles/roles.routes'));
router.use('/permissions', require('../../modules/permissions/permissions.routes'));

// OOMS Routes
router.use('/leads', require('../../modules/leads/leads.routes'));
router.use('/customers', require('../../modules/customers/customers.routes'));
router.use('/firms', require('../../modules/firms/firms.routes'));
router.use('/orders', require('../../modules/orders/orders.routes'));
router.use('/dispatches', require('../../modules/dispatches/dispatches.routes'));
router.use('/finance', require('../../modules/finance/finance.routes'));
router.use('/upload', require('../../modules/upload/upload.routes'));
router.use('/masters', require('../../modules/masters/masters.routes'));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString(),
    version: 'v1'
  });
});

module.exports = router;
