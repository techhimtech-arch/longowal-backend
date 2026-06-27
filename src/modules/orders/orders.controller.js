const asyncHandler = require('express-async-handler');
const Order = require('../../models/Order');

// @desc    Create a new order
// @route   POST /api/v1/orders
// @access  Private (Sales)
const createOrder = asyncHandler(async (req, res) => {
  const orderData = req.body;
  
  // Assign a unique order number
  if (!orderData.orderNumber) {
    orderData.orderNumber = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
  }
  
  if (!orderData.salesExecutiveId) {
    orderData.salesExecutiveId = req.user.id;
  }
  
  // Create order
  const order = await Order.create(orderData);
  
  res.status(201).json({
    success: true,
    data: order
  });
});

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  let query = {};
  
  // Filter based on roles
  if (req.user && req.user.userType === 'SALES_EXECUTIVE') {
    query.salesExecutiveId = req.user.id;
  } else if (req.user && req.user.userType === 'LOGISTICS_TEAM') {
    // Logistics team should only see orders that are approved or beyond
    query.status = { $in: ['APPROVED', 'LOGISTICS_PENDING', 'FREIGHT_APPROVAL_PENDING', 'DISPATCH_READY', 'PACKED', 'SHIPPED', 'DELIVERED'] };
  }
  
  // Additional filters from query params
  if (req.query.status) query.status = req.query.status;
  if (req.query.customerId) query.customerId = req.query.customerId;
  if (req.query.executionFirmId) query.executionFirmId = req.query.executionFirmId;

  const orders = await Order.find(query)
    .populate('customerId', 'companyName customerCode')
    .populate('executionFirmId', 'firmName')
    .populate('salesExecutiveId', 'firstName lastName')
    .sort('-createdAt');
    
  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customerId')
    .populate('executionFirmId')
    .populate('salesExecutiveId', 'firstName lastName email');
    
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  
  let order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  order.status = status;
  if (remarks) order.remarks = remarks;
  
  await order.save();

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update logistics details
// @route   PUT /api/v1/orders/:id/logistics
// @access  Private (Logistics Team)
const updateOrderLogistics = asyncHandler(async (req, res) => {
  const { logistics, status } = req.body;
  
  let order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  order.logistics = { ...order.logistics, ...logistics };
  if (status) order.status = status; // Typically updates to FREIGHT_APPROVAL_PENDING or DISPATCH_READY
  
  await order.save();

  res.status(200).json({
    success: true,
    data: order
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrderLogistics
};
