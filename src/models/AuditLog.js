const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
    },
    userRole: {
      type: String,
    },
    // Organization context
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // Action details
    action: {
      type: String,
      required: true,
      enum: [
        // Auth actions
        'LOGIN',
        'LOGOUT',
        'LOGIN_FAILED',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET',
        'TOKEN_REFRESH',
        // User management
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DELETE',
        'USER_ACTIVATE',
        'USER_DEACTIVATE',
        // Student management
        'STUDENT_CREATE',
        'STUDENT_UPDATE',
        'STUDENT_DELETE',
        'STUDENT_BULK_IMPORT',
        // Class management
        'CLASS_CREATE',
        'CLASS_UPDATE',
        'CLASS_DELETE',
        // Section management
        'SECTION_CREATE',
        'SECTION_UPDATE',
        'SECTION_DELETE',
        // Attendance
        'ATTENDANCE_MARK',
        'ATTENDANCE_UPDATE',
        'ATTENDANCE_BULK_MARK',
        // Fees
        'FEE_STRUCTURE_CREATE',
        'FEE_STRUCTURE_UPDATE',
        'FEE_PAYMENT_RECORD',
        'FEE_PAYMENT_UPDATE',
        // Exams & Results
        'EXAM_CREATE',
        'EXAM_UPDATE',
        'EXAM_DELETE',
        'RESULT_ADD',
        'RESULT_UPDATE',
        'RESULT_DELETE',
        'REPORT_CARD_GENERATE',
        // Academic Year
        'ACADEMIC_YEAR_CREATE',
        'ACADEMIC_YEAR_UPDATE',
        'ACADEMIC_YEAR_SET_CURRENT',
        // Teacher Assignment
        'TEACHER_ASSIGNMENT_CREATE',
        'TEACHER_ASSIGNMENT_UPDATE',
        'TEACHER_ASSIGNMENT_DELETE',
        // Subject
        'SUBJECT_CREATE',
        'SUBJECT_UPDATE',
        'SUBJECT_DELETE',
        // Announcements
        'ANNOUNCEMENT_CREATE',
        'ANNOUNCEMENT_UPDATE',
        'ANNOUNCEMENT_DELETE',
        'ANNOUNCEMENT_SEND',
        // School management
        'SCHOOL_REGISTER',
        'SCHOOL_UPDATE',
        'SCHOOL_DEACTIVATE',
        // Generic
        'DATA_EXPORT',
        'DATA_IMPORT',
        'SETTINGS_UPDATE',
        'OTHER',
      ],
    },
    // Resource being acted upon
    resourceType: {
      type: String,
      enum: [
        'User',
        'Student',
        'Class',
        'Section',
        'Attendance',
        'Fee',
        'FeePayment',
        'Exam',
        'Result',
        'AcademicYear',
        'TeacherAssignment',
        'Subject',
        'Announcement',
        'School',
        'ReportCard',
        'Other',
      ],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Request details
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    path: {
      type: String,
    },
    statusCode: {
      type: Number,
    },
    // Change details
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Additional context
    description: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Request context
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    requestId: {
      type: String,
    },
    // Success/Failure
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index - auto-delete logs after 2 years (adjust as needed)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// Static method to log an action
auditLogSchema.statics.log = async function (logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    // Don't throw - audit logging shouldn't break the application
    console.error('Audit log error:', error.message);
    return null;
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function (userId, options = {}) {
  const { limit = 50, skip = 0, startDate, endDate } = options;
  
  const query = { userId };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get school activity
auditLogSchema.statics.getSchoolActivity = async function (schoolId, options = {}) {
  const { limit = 100, skip = 0, action, resourceType, startDate, endDate } = options;
  
  const query = { schoolId };
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
