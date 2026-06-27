const mongoose = require('mongoose');

const userTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    enum: ['ADMIN', 'STAFF', 'CUSTOMER', 'PARTNER']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for efficient queries
userTypeSchema.index({ name: 1 });

// Static method to find by name
userTypeSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toUpperCase() });
};

module.exports = mongoose.model('UserType', userTypeSchema);
