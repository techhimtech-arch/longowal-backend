const express = require('express');
const {
  getNotifications,
  readAllNotifications,
  readNotification
} = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

// All notification endpoints are private
router.use(authenticate);

router.route('/')
  .get(getNotifications);

router.put('/read-all', readAllNotifications);

router.put('/:id/read', readNotification);

module.exports = router;
