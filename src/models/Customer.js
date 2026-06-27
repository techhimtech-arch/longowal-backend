const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const addressSchema = new mongoose.Schema({
  line1: { type: String, trim: true },
  line2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, default: 'India', trim: true },
  pincode: { type: String, trim: true }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  customerCode: { type: String, unique: true },
  companyName: { type: String, required: true, trim: true },
  
  // Tax Details
  gstNumber: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  
  // Contacts
  primaryContact: {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  secondaryContact: {
    name: { type: String, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  
  // Addresses
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  
  // Commercial Details
  creditLimit: { type: Number, default: 0 },
  paymentTerms: { type: String, trim: true }, // e.g. "Net 30"
  customerCategory: { type: String, trim: true },
  
  // Statistics
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 }
  },
  
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, {
  timestamps: true
});

customerSchema.index({ companyName: 1 });
customerSchema.index({ customerCode: 1 });
customerSchema.index({ status: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
