const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const firmSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  firmName: { type: String, required: true, trim: true },
  gstNumber: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  
  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    pincode: { type: String, trim: true }
  },
  
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    branch: { type: String, trim: true }
  },
  
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, {
  timestamps: true
});

firmSchema.index({ firmName: 1 });
firmSchema.index({ status: 1 });

const Firm = mongoose.model('Firm', firmSchema);

module.exports = Firm;
