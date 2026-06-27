const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  token: { type: String, required: true },
  
  organizationId: { type: mongoose.Schema.Types.ObjectId },
  family: { type: String },
  isRevoked: { type: Boolean, default: false },
  revokedAt: { type: Date },
  revokedReason: { type: String },

  userAgent: String,
  ipAddress: String,

  expiresAt: Date
},
{ timestamps: true }
);

// Add missing revoke function that auth service was crying about
refreshTokenSchema.methods.revoke = async function(reason) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return await this.save();
};

// Static methods used in auth.service it seems
refreshTokenSchema.statics.findValidToken = function(token) {
  return this.findOne({ token, isRevoked: false, expiresAt: { $gt: new Date() } });
};

refreshTokenSchema.statics.revokeFamily = function(family, reason) {
  return this.updateMany(
    { family, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: reason } }
  );
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
