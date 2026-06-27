const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

// Ensure related models are registered
require('./Role');
require('./Organization');

const userSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [60, 'Password hash is too short'],
    select: false // Exclude by default in queries
  },
  
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    maxlength: 20
  },
  
  profileImage: {
    type: String,
    trim: true,
    maxlength: 500
  },
  

  userType: {
    type: String,
    enum: {
      values: ["SUPER_ADMIN", "ORG_ADMIN", "OFFICER", "VOLUNTEER", "CITIZEN"],
      message: '{VALUE} is not a valid user type'
    },
    default: "CITIZEN"
  },
  
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role"
  },
  
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization"
  },
  
  status: {
    type: String,
    required: true,
    enum: {
      values: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      message: '{VALUE} is not a valid status'
    },
    default: 'ACTIVE'
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  lastLoginAt: {
    type: Date
  },
  
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  
  lockUntil: {
    type: Date,
    select: false
  },
  
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  emailVerificationToken: {
    type: String,
    select: false
  },
  
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt']
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.emailVerificationToken;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Indexes for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ status: 1 });
userSchema.index({ uuid: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ emailVerified: 1 });
userSchema.index({ lastLoginAt: -1 });

// Compound indexes
userSchema.index({ status: 1, userType: 1 });

// Pre-validate middleware to hash password before validation
userSchema.pre('validate', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  // Skip if already a valid bcrypt hash (prevents double hashing)
  if (this.passwordHash && this.passwordHash.startsWith('$2') && this.passwordHash.length === 60) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not available');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to get user permissions
userSchema.methods.getPermissions = async function() {
  const user = await this.populate({
    path: 'roles',
    populate: {
      path: 'roleId',
      populate: {
        path: 'permissions',
        model: 'Permission'
      }
    }
  });
  
  const permissions = new Set();
  user.roles.forEach(userRole => {
    if (userRole.roleId && userRole.roleId.permissions) {
      userRole.roleId.permissions.forEach(permission => {
        if (permission.isActive) {
          permissions.add(permission.name);
        }
      });
    }
  });
  
  return Array.from(permissions);
};

// Static method to find by email with role. This maps to the existing findByEmailWithRoles
// but handles the logic that auth.service.js expects.
userSchema.statics.findByEmailWithRole = function(email) {
  // `select('+passwordHash')` ensures that we can verify the password.
  // Note: we might need to adjust auth.service.js or simulate what it expects
  // auth.service expects: { isActive: true, roleId: { name: 'superadmin', ... }, comparePassword, email, etc. }
  return this.findOne({ email }).select('+passwordHash').populate({ path: 'roleId', strictPopulate: false });
};

// Static method to find by email with organization and roles
userSchema.statics.findByEmailWithRoles = function(email) {
  return this.findOne({ email, status: 'ACTIVE' })
    .populate({
      path: 'roles',
      populate: {
        path: 'roleId',
        model: 'Role'
      }
    });
};

// Static method to find active users by user type
userSchema.statics.findActiveByUserType = function(userType) {
  return this.find({ userType, status: 'ACTIVE' })
    .populate({
      path: 'roles',
      populate: {
        path: 'roleId',
        model: 'Role'
      }
    });
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(roleName) {
  return this.find({ status: 'ACTIVE' })
    .populate({
      path: 'roles',
      populate: {
        path: 'roleId',
        match: { name: roleName, isActive: true }
      }
    });
};

// Virtual for roles
userSchema.virtual('roles', {
  ref: 'UserRole',
  localField: '_id',
  foreignField: 'userId'
});

const User = mongoose.model('User', userSchema);

module.exports = User;