const mongoose = require('mongoose');

const masterDataSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['STATE', 'PLANT', 'PRODUCT', 'OTHER'],
    index: true
  },
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure unique keys per category
masterDataSchema.index({ category: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('MasterData', masterDataSchema);
