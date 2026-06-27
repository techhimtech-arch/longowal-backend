const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Not required for system assignments during seeding
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
rolePermissionSchema.index({ roleId: 1, isActive: 1 });
rolePermissionSchema.index({ permissionId: 1, isActive: 1 });

// Static method to find active permissions for role
rolePermissionSchema.statics.findActivePermissionsForRole = function(roleId) {
  return this.find({ roleId, isActive: true })
    .populate('permissionId');
};

// Static method to assign permission to role
rolePermissionSchema.statics.assignPermissionToRole = function(roleId, permissionId, assignedBy) {
  return this.create({
    roleId,
    permissionId,
    assignedBy
  });
};

// Static method to remove permission from role
rolePermissionSchema.statics.removePermissionFromRole = function(roleId, permissionId) {
  return this.updateOne(
    { roleId, permissionId, isActive: true },
    { isActive: false }
  );
};

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
