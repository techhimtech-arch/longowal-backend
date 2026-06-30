const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderProductSchema = new mongoose.Schema({
  productName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true }, // e.g., kg, tons
  rate: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  supplyRate: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  margin: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 }
}, { _id: true });

const orderStatusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String },
  remarks: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  orderNumber: { type: String, unique: true },
  enquiryDate: { type: Date, default: Date.now },
  orderDate: { type: Date, default: Date.now },
  expectedPaymentDate: { type: Date },
  
  // Relations
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  executionFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
  salesExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedLogisticsId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  
  // Products
  products: [orderProductSchema],
  
  // Delivery Information
  deliveryAddress: { type: String, trim: true },
  dispatchLocation: { type: String, trim: true },
  plantName: { type: String, trim: true },
  requiredDeliveryDate: { type: Date },
  estimatedFreight: { type: Number, default: 0 },
  
  // Financial Details
  totalOrderValue: { type: Number, required: true, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  
  // Logistics Details (Added by Logistics Team)
  logistics: {
    transporterName: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverMobile: { type: String, trim: true },
    freightCost: { type: Number, default: 0 },
    loadingCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    lrNumber: { type: String, trim: true },
    dispatchDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    isFreightApproved: { type: Boolean, default: false }
  },
  
  // Payment tracking summary
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'PAID'],
    default: 'PENDING'
  },
  
  // Workflow Status
  status: {
    type: String,
    enum: [
      'DRAFT', 
      'PENDING_MD_APPROVAL', 
      'APPROVED', 
      'REJECTED', 
      'LOGISTICS_PENDING', 
      'FREIGHT_APPROVAL_PENDING', 
      'DISPATCH_READY', 
      'PACKED', 
      'SHIPPED', 
      'DELIVERED', 
      'SENT_TO_ACCOUNTS', 
      'INVOICE_GENERATED', 
      'PAYMENT_PENDING', 
      'PARTIAL_PAYMENT', 
      'PAID', 
      'COMPLETED', 
      'CANCELLED'
    ],
    default: 'DRAFT'
  },
  
  remarks: { type: String, trim: true },
  statusHistory: [orderStatusHistorySchema],
  materialAdjustment: {
    adjustedToOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    adjustmentType: { type: String, enum: ['DIVERTED_TO_OTHER_ORDER', 'RETURNED_TO_STOCK', 'OTHER'], default: 'RETURNED_TO_STOCK' },
    adjustmentRemarks: { type: String, trim: true },
    adjustedAt: { type: Date },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, {
  timestamps: true
});

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ executionFirmId: 1 });
orderSchema.index({ salesExecutiveId: 1 });
orderSchema.index({ status: 1 });

// Pre-save to auto-calculate values
orderSchema.pre('save', function(next) {
  if (this.products && this.products.length > 0) {
    this.products.forEach(p => {
      if (p.supplyRate !== undefined || p.freight !== undefined || p.margin !== undefined || p.gstPercent !== undefined) {
        const supplyRate = p.supplyRate || 0;
        const freight = p.freight || 0;
        const margin = p.margin || 0;
        const gstPercent = p.gstPercent || 0;
        
        const supplyValue = p.quantity * supplyRate;
        const baseCostForGst = supplyValue + freight;
        p.gstAmount = Number((baseCostForGst * (gstPercent / 100)).toFixed(2));
        p.total = Number((baseCostForGst + p.gstAmount + margin).toFixed(2));
        p.rate = p.quantity > 0 ? Number((p.total / p.quantity).toFixed(2)) : 0;
      }
    });
    this.totalOrderValue = this.products.reduce((acc, p) => acc + (p.total || 0), 0);
  }
  this.balanceAmount = this.totalOrderValue - (this.advanceAmount || 0);
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
