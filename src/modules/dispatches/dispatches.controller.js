const asyncHandler = require('express-async-handler');
const Dispatch = require('../../models/Dispatch');
const Order = require('../../models/Order');

// @desc    Create a new dispatch
// @route   POST /api/v1/dispatches
// @access  Private (Logistics/Admin)
const createDispatch = asyncHandler(async (req, res) => {
  const dispatchData = req.body;
  
  if (!dispatchData.dispatchNumber) {
    dispatchData.dispatchNumber = 'DSP-' + Math.floor(10000 + Math.random() * 90000);
  }
  
  // Verify order exists
  const order = await Order.findById(dispatchData.orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Pre-fill fields from order if not provided
  if (!dispatchData.firmId) dispatchData.firmId = order.executionFirmId;
  if (!dispatchData.customerId) dispatchData.customerId = order.customerId;
  
  const dispatch = await Dispatch.create(dispatchData);
  
  // Update order status
  order.status = 'DISPATCH_READY';
  await order.save();
  
  res.status(201).json({
    success: true,
    data: dispatch
  });
});

// @desc    Get all dispatches
// @route   GET /api/v1/dispatches
// @access  Private
const getDispatches = asyncHandler(async (req, res) => {
  let query = {};
  
  if (req.query.status) query.status = req.query.status;
  if (req.query.firmId) query.firmId = req.query.firmId;
  
  const dispatches = await Dispatch.find(query)
    .populate('orderId', 'orderNumber')
    .populate('customerId', 'companyName customerCode')
    .populate('firmId', 'firmName')
    .sort('-createdAt');
    
  res.status(200).json({
    success: true,
    count: dispatches.length,
    data: dispatches
  });
});

// @desc    Get single dispatch
// @route   GET /api/v1/dispatches/:id
// @access  Private
const getDispatch = asyncHandler(async (req, res) => {
  const dispatch = await Dispatch.findById(req.params.id)
    .populate('orderId')
    .populate('customerId')
    .populate('firmId');
    
  if (!dispatch) {
    res.status(404);
    throw new Error('Dispatch not found');
  }

  res.status(200).json({
    success: true,
    data: dispatch
  });
});

// @desc    Update dispatch status
// @route   PUT /api/v1/dispatches/:id/status
// @access  Private
const updateDispatchStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  
  let dispatch = await Dispatch.findById(req.params.id);
  
  if (!dispatch) {
    res.status(404);
    throw new Error('Dispatch not found');
  }
  
  dispatch.status = status;
  if (remarks) dispatch.remarks = remarks;
  
  if (status === 'DELIVERED') {
    dispatch.actualDeliveryDate = Date.now();
  }
  
  await dispatch.save();
  
  // Sync with order status
  const order = await Order.findById(dispatch.orderId);
  if (order) {
    if (status === 'DISPATCHED' || status === 'IN_TRANSIT') {
      order.status = 'SHIPPED';
    } else if (status === 'DELIVERED') {
      order.status = 'DELIVERED';
    }
    await order.save();
  }

  res.status(200).json({
    success: true,
    data: dispatch
  });
});

module.exports = {
  createDispatch,
  getDispatches,
  getDispatch,
  updateDispatchStatus
};
