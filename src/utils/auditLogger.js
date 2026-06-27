const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

class AuditLogger {
  /**
   * Log an audit event
   * @param {Object} auditData - Audit data
   * @param {string} auditData.action - Action performed
   * @param {string} auditData.userId - User ID who performed the action
   * @param {string} auditData.userType - User type (role)
   * @param {string} auditData.targetId - Target entity ID
   * @param {string} auditData.targetType - Target entity type
   * @param {Object} auditData.details - Additional details
   * @param {string} auditData.ipAddress - IP address
   * @param {string} auditData.userAgent - User agent
   */
  async log(auditData) {
    try {
      const auditLog = new AuditLog({
        action: auditData.action,
        userId: auditData.userId,
        userType: auditData.userType,
        targetId: auditData.targetId,
        targetType: auditData.targetType,
        details: auditData.details || {},
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        timestamp: new Date()
      });

      await auditLog.save();
      
      logger.info('Audit log created', {
        action: auditData.action,
        userId: auditData.userId,
        targetType: auditData.targetType
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error.message,
        auditData
      });
      // Don't throw error to avoid breaking main functionality
      return null;
    }
  }

  /**
   * Get audit logs with filtering
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options
   */
  async getLogs(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const query = {};

      // Build query from filter
      if (filter.action) {
        query.action = filter.action;
      }
      if (filter.userId) {
        query.userId = filter.userId;
      }
      if (filter.userType) {
        query.userType = filter.userType;
      }
      if (filter.targetType) {
        query.targetType = filter.targetType;
      }
      if (filter.targetId) {
        query.targetId = filter.targetId;
      }
      if (filter.startDate || filter.endDate) {
        query.timestamp = {};
        if (filter.startDate) {
          query.timestamp.$gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          query.timestamp.$lte = new Date(filter.endDate);
        }
      }

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Pagination
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filter - Filter criteria
   */
  async getStats(filter = {}) {
    try {
      const matchStage = {};

      // Build match stage from filter
      if (filter.startDate || filter.endDate) {
        matchStage.timestamp = {};
        if (filter.startDate) {
          matchStage.timestamp.$gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          matchStage.timestamp.$lte = new Date(filter.endDate);
        }
      }

      const [
        actionStats,
        userStats,
        targetStats,
        totalLogs
      ] = await Promise.all([
        AuditLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        AuditLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$userType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        AuditLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$targetType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        AuditLog.countDocuments(matchStage)
      ]);

      return {
        total: totalLogs,
        byAction: actionStats,
        byUserType: userStats,
        byTargetType: targetStats
      };
    } catch (error) {
      logger.error('Failed to get audit stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   */
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info('Old audit logs cleaned', {
        deletedCount: result.deletedCount,
        cutoffDate
      });

      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to clean old audit logs', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AuditLogger();
