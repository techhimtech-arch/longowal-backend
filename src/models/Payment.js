const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Relations
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  
  // Payment Details
  paymentDate: { type: Date, required: true, default: Date.now },
  amountReceived: { type: Number, required: true, min: 0 },
  paymentMode: { 
    type: String, 
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CREDIT_CARD', 'OTHER'],
    required: true 
  },
  referenceNumber: { type: String, trim: true },
  remarks: { type: String, trim: true },
  
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'SUCCESS'
  }
}, {
  timestamps: true
});

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ paymentDate: -1 });

// Post-save hook to update invoice and customer outstanding
paymentSchema.post('save', async function(doc, next) {
  if (doc.status === 'SUCCESS') {
    try {
      const Invoice = mongoose.model('Invoice');
      const Customer = mongoose.model('Customer');
      
      // Update Invoice
      const invoice = await Invoice.findById(doc.invoiceId);
      if (invoice) {
        invoice.receivedAmount += doc.amountReceived;
        await invoice.save();
      }
      
      // Update Customer Statistics
      const customer = await Customer.findById(doc.customerId);
      if (customer) {
        // Find all invoices for this customer to recalculate outstanding correctly
        // Or simply subtract from outstanding (assuming it's synced)
        // A full recalculation is safer, but subtracting is faster.
        customer.stats.outstandingAmount = Math.max(0, customer.stats.outstandingAmount - doc.amountReceived);
        await customer.save();
      }
    } catch (error) {
      console.error('Error updating invoice/customer after payment:', error);
    }
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
