const mongoose = require("mongoose");

const loginAuditSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // Make userId optional for failed logins where user might not exist
    required: false 
  },
  
  email: {
    type: String,
    required: false
  },

  ipAddress: String,
  userAgent: String,
  
  action: {
    type: String,
    required: false
  },

  status: {
    type: String,
    enum: ["SUCCESS", "FAILED"],
    default: "SUCCESS"
  },
  
  failureReason: {
    type: String,
    required: false
  },
  
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  sessionId: mongoose.Schema.Types.ObjectId,
  tokenFamily: String
},
{ timestamps: true }
);

// Static method to match what auth.service.js expects
loginAuditSchema.statics.logLoginAttempt = async function(data) {
  try {
    return await this.create({
      userId: data.userId || null,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: data.success ? "SUCCESS" : "FAILED",
      action: data.action,
      failureReason: data.failureReason,
      role: data.role,
      organizationId: data.organizationId,
      sessionId: data.sessionId,
      tokenFamily: data.tokenFamily
    });
  } catch (err) {
    console.error('Error logging login audit:', err);
    // Do not throw error here to prevent blocking the actual login process
    return null;
  }
};

module.exports = mongoose.model("LoginAudit", loginAuditSchema);
