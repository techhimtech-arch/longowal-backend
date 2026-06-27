const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  resource: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    maxlength: 50
  },
  action: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
permissionSchema.index({ name: 1 });
permissionSchema.index({ resource: 1, action: 1 });
permissionSchema.index({ isActive: 1 });

// Static method to find by name
permissionSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toUpperCase(), isActive: true });
};

// Static method to find by resource and action
permissionSchema.statics.findByResourceAction = function(resource, action) {
  return this.findOne({ 
    resource: resource.toUpperCase(), 
    action: action.toUpperCase(), 
    isActive: true 
  });
};

module.exports = mongoose.model('Permission', permissionSchema);
