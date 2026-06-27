const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
    uppercase: true
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization"
  },

  isActive: {
    type: Boolean,
    default: true
  },
  
  isSystem: {
    type: Boolean,
    default: false,
    description: 'System roles cannot be deleted'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      return ret;
    }
  }
});

// Indexes for efficient queries
roleSchema.index({ name: 1 });
roleSchema.index({ organizationId: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ isSystem: 1 });

// Static method to find active roles
roleSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find by organization
roleSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organizationId, isActive: true });
};

// Static method to find system roles
roleSchema.statics.findSystemRoles = function() {
  return this.find({ isSystem: true, isActive: true });
};

module.exports = mongoose.model("Role", roleSchema);
