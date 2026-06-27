const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const dispatchSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  dispatchNumber: { type: String, unique: true },
  
  // Relations
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  
  // Logistics Info
  transporterName: { type: String, trim: true },
  vehicleNumber: { type: String, required: true, trim: true },
  driverName: { type: String, required: true, trim: true },
  driverMobile: { type: String, required: true, trim: true },
  lrNumber: { type: String, trim: true },
  
  // Dates
  dispatchDate: { type: Date, required: true, default: Date.now },
  expectedDeliveryDate: { type: Date },
  actualDeliveryDate: { type: Date },
  
  // Documents (URLs)
  invoiceUrl: { type: String, trim: true },
  lrCopyUrl: { type: String, trim: true },
  podUrl: { type: String, trim: true },
  
  status: {
    type: String,
    enum: ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'],
    default: 'PLANNED'
  },
  
  remarks: { type: String, trim: true }
}, {
  timestamps: true
});

dispatchSchema.index({ dispatchNumber: 1 });
dispatchSchema.index({ orderId: 1 });
dispatchSchema.index({ status: 1 });

const Dispatch = mongoose.model('Dispatch', dispatchSchema);

module.exports = Dispatch;
