const asyncHandler = require('express-async-handler');
const Notification = require('../../models/Notification');

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id || req.user._id;
  
  const notifications = await Notification.find({ userId })
    .sort('-createdAt')
    .limit(50);
    
  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

// @desc    Mark all user notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
const readAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id || req.user._id;
  
  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Mark a single notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
const readNotification = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id || req.user._id;
  
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId
  });
  
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  
  notification.isRead = true;
  await notification.save();
  
  res.status(200).json({
    success: true,
    data: notification
  });
});

module.exports = {
  getNotifications,
  readAllNotifications,
  readNotification
};
