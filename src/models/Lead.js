const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const leadSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Basic Information
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  designation: { type: String, trim: true },
  mobile: { type: String, required: true, trim: true },
  alternateMobile: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  
  // Business Information
  gstNumber: { type: String, trim: true },
  industryType: { type: String, trim: true },
  feedType: { type: String, trim: true },
  monthlyConsumption: { type: Number },
  productInterest: [{ type: String, trim: true }],
  estimatedQuantity: { type: Number },
  
  // Address
  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    pincode: { type: String, trim: true }
  },
  
  // Assignment
  leadSource: { type: String, trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  assignedExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'],
    default: 'New'
  },
  
  // Followups
  followups: [{
    date: { type: Date, required: true },
    type: { type: String, enum: ['Call', 'Meeting', 'Email'], required: true },
    outcome: { type: String, trim: true },
    notes: { type: String, trim: true },
    nextFollowupDate: { type: Date }
  }],
  
  isConverted: { type: Boolean, default: false }
}, {
  timestamps: true
});

leadSchema.index({ companyName: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedExecutiveId: 1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
