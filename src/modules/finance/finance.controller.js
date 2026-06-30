const asyncHandler = require('express-async-handler');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Order = require('../../models/Order');
const Customer = require('../../models/Customer');
const { createNotification, notifyRole } = require('../../utils/notification');

// @desc    Create a new invoice
// @route   POST /api/v1/finance/invoices
// @access  Private (Accounts/Admin)
const createInvoice = asyncHandler(async (req, res) => {
  if (req.user) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    const isAccounts = userType === 'CITIZEN' || role === 'accounts' || role === 'accountant';
    const isSuperAdmin = userType === 'SUPER_ADMIN' || role === 'superadmin' || role === 'admin';
    const isMD = userType === 'MD' || role === 'md' || role === 'cmd' || role === 'managingdirector';
    
    if (!isAccounts && !isSuperAdmin && !isMD) {
      res.status(403);
      throw new Error('Insufficient permissions: Only Accounts team, MD, or Admin are authorized to perform this operation');
    }
  }

  const invoiceData = req.body;
  
  if (!invoiceData.invoiceNumber) {
    invoiceData.invoiceNumber = 'INV-' + Math.floor(10000 + Math.random() * 90000);
  }
  
  const order = await Order.findById(invoiceData.orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  if (!invoiceData.customerId) invoiceData.customerId = order.customerId;
  if (!invoiceData.firmId) invoiceData.firmId = order.executionFirmId;
  
  // Set initial outstanding
  invoiceData.outstandingAmount = invoiceData.invoiceAmount;
  
  const invoice = await Invoice.create(invoiceData);
  
  // Update order status
  order.status = 'INVOICE_GENERATED';
  order.paymentStatus = 'PENDING';
  await order.save();
  
  // Update Customer total revenue and outstanding
  const customer = await Customer.findById(invoiceData.customerId);
  if (customer) {
    customer.stats.totalRevenue += invoiceData.invoiceAmount;
    customer.stats.outstandingAmount += invoiceData.invoiceAmount;
    await customer.save();
  }
  
  res.status(201).json({
    success: true,
    data: invoice
  });
});

// @desc    Get all invoices
// @route   GET /api/v1/finance/invoices
// @access  Private
const getInvoices = asyncHandler(async (req, res) => {
  let query = {};
  
  if (req.query.status) query.status = req.query.status;
  if (req.query.customerId) query.customerId = req.query.customerId;
  if (req.query.firmId) query.firmId = req.query.firmId;
  
  const invoices = await Invoice.find(query)
    .populate('orderId', 'orderNumber')
    .populate('customerId', 'companyName customerCode')
    .populate('firmId', 'firmName')
    .sort('-createdAt');
    
  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices
  });
});

// @desc    Record a new payment
// @route   POST /api/v1/finance/payments
// @access  Private (Accounts/Admin)
const recordPayment = asyncHandler(async (req, res) => {
  if (req.user) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    const isAccounts = userType === 'CITIZEN' || role === 'accounts' || role === 'accountant';
    const isSuperAdmin = userType === 'SUPER_ADMIN' || role === 'superadmin' || role === 'admin';
    const isMD = userType === 'MD' || role === 'md' || role === 'cmd' || role === 'managingdirector';
    
    if (!isAccounts && !isSuperAdmin && !isMD) {
      res.status(403);
      throw new Error('Insufficient permissions: Only Accounts team, MD, or Admin are authorized to perform this operation');
    }
  }

  const paymentData = req.body;
  
  const invoice = await Invoice.findById(paymentData.invoiceId);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }
  
  if (!paymentData.customerId) paymentData.customerId = invoice.customerId;
  
  const payment = await Payment.create(paymentData);
  
  // The post-save hook on Payment model handles updating Invoice and Customer stats
  
  // Update order payment status
  const order = await Order.findById(invoice.orderId);
  if (order) {
    const updatedInvoice = await Invoice.findById(invoice._id);
    if (updatedInvoice.status === 'PAID') {
      order.paymentStatus = 'PAID';
      order.status = 'COMPLETED';
    } else if (updatedInvoice.status === 'PARTIAL') {
      order.paymentStatus = 'PARTIAL_PAYMENT';
      order.status = 'PARTIAL_PAYMENT';
    }
    await order.save();

    if (order.status === 'COMPLETED') {
      await createNotification({
        userId: order.salesExecutiveId,
        title: 'Payment Completed',
        message: `Payment for order ${order.orderNumber} has been completed and closed.`,
        type: 'PAYMENT_COMPLETED',
        orderId: order._id
      });
      if (order.assignedLogisticsId) {
        await createNotification({
          userId: order.assignedLogisticsId,
          title: 'Payment Completed',
          message: `Payment for order ${order.orderNumber} has been completed.`,
          type: 'PAYMENT_COMPLETED',
          orderId: order._id
        });
      }
      await notifyRole({
        roleName: 'md',
        userType: 'MD',
        title: 'Order Payment Completed',
        message: `Payment for order ${order.orderNumber} is completed.`,
        type: 'PAYMENT_COMPLETED',
        orderId: order._id
      });
    }
  }
  
  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Get all payments
// @route   GET /api/v1/finance/payments
// @access  Private
const getPayments = asyncHandler(async (req, res) => {
  let query = {};
  
  if (req.query.customerId) query.customerId = req.query.customerId;
  if (req.query.invoiceId) query.invoiceId = req.query.invoiceId;
  
  const payments = await Payment.find(query)
    .populate('invoiceId', 'invoiceNumber invoiceAmount')
    .populate('customerId', 'companyName')
    .sort('-createdAt');
    
  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

module.exports = {
  createInvoice,
  getInvoices,
  recordPayment,
  getPayments
};
