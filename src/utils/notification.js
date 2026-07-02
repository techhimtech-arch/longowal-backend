const Notification = require('../models/Notification');
const User = require('../models/User');
const Role = require('../models/Role');
const logger = require('../config/logger');

/**
 * Create a notification for a specific user
 */
const createNotification = async ({ userId, title, message, type, orderId }) => {
  try {
    if (!userId) return null;
    
    const finalUserId = userId._id || userId;
    const finalOrderId = orderId ? (orderId._id || orderId) : undefined;
    
    const notification = await Notification.create({
      userId: finalUserId,
      title,
      message,
      type,
      orderId: finalOrderId
    });
    
    logger.info('Notification created', {
      notificationId: notification._id,
      userId: finalUserId,
      type
    });
    
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { error: error.message });
    return null;
  }
};

/**
 * Broadcast notification to all active users matching a role name or userType
 */
const notifyRole = async ({ roleName, userType, title, message, type, orderId }) => {
  try {
    const query = { status: 'ACTIVE' };
    
    // Build array of conditions
    const conditions = [];
    if (userType) {
      conditions.push({ userType });
    }
    if (roleName) {
      // Find Role ID by name matching regex
      const roleDocs = await Role.find({
        name: { $regex: new RegExp(roleName, 'i') },
        isActive: true
      });
      if (roleDocs.length > 0) {
        conditions.push({ roleId: { $in: roleDocs.map(r => r._id) } });
      }
    }
    
    if (conditions.length > 0) {
      query.$or = conditions;
    } else {
      // If neither specified, do nothing
      return [];
    }
    
    const users = await User.find(query);
    
    const promises = users.map(user => 
      createNotification({
        userId: user._id,
        title,
        message,
        type,
        orderId
      })
    );
    
    return await Promise.all(promises);
  } catch (error) {
    logger.error('Failed to broadcast notification to role', { error: error.message });
    return [];
  }
};

module.exports = {
  createNotification,
  notifyRole
};
