const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const invoiceSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  invoiceNumber: { type: String, unique: true, required: true },
  
  // Relations
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
  
  // Details
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },
  
  invoiceAmount: { type: Number, required: true, min: 0 },
  receivedAmount: { type: Number, default: 0, min: 0 },
  outstandingAmount: { type: Number, required: true, min: 0 },
  
  invoicePdfUrl: { type: String, trim: true },
  
  status: {
    type: String,
    enum: ['GENERATED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'GENERATED'
  },
  
  remarks: { type: String, trim: true }
}, {
  timestamps: true
});

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ orderId: 1 });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ status: 1 });

// Pre-save to auto-calculate outstanding
invoiceSchema.pre('save', function(next) {
  this.outstandingAmount = this.invoiceAmount - (this.receivedAmount || 0);
  
  if (this.outstandingAmount <= 0) {
    this.status = 'PAID';
  } else if (this.receivedAmount > 0) {
    this.status = 'PARTIAL';
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
