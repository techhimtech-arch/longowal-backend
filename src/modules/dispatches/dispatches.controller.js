const asyncHandler = require('express-async-handler');
const Dispatch = require('../../models/Dispatch');
const Order = require('../../models/Order');
const { createNotification, notifyRole } = require('../../utils/notification');

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
  if (dispatch.status === 'FREIGHT_APPROVAL_PENDING') {
    order.status = 'FREIGHT_APPROVAL_PENDING';
    order.viewedBy = []; // Reset viewedBy so it triggers unread indicator for MD
  } else if (dispatch.status === 'DISPATCHED' || dispatch.status === 'IN_TRANSIT') {
    order.status = 'SHIPPED';
    order.viewedBy = [];
  } else {
    order.status = 'LOGISTICS_PENDING';
  }
  await order.save();

  // Trigger MD notification for freight approval
  if (dispatch.status === 'FREIGHT_APPROVAL_PENDING') {
    await notifyRole({
      roleName: 'md',
      userType: 'MD',
      title: 'Freight Approval Awaiting Review',
      message: `Freight cost for order ${order.orderNumber} (vehicle ${dispatch.vehicleNumber}) is waiting for MD approval.`,
      type: 'AWAITING_FREIGHT_APPROVAL',
      orderId: order._id
    });
  }
  
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
  if (req.query.orderId) query.orderId = req.query.orderId;
  
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
  
  if (status === 'APPROVED_FREIGHT') {
    dispatch.status = 'PLANNED';
    dispatch.isFreightApproved = true;
  } else if (status === 'REJECTED_FREIGHT') {
    dispatch.status = 'PLANNED';
    dispatch.isFreightApproved = false;
  } else {
    dispatch.status = status;
  }
  
  if (remarks) dispatch.remarks = remarks;
  
  if (dispatch.status === 'DELIVERED') {
    dispatch.actualDeliveryDate = Date.now();
  }
  
  await dispatch.save();
  
  // Sync with order status
  const order = await Order.findById(dispatch.orderId);
  if (order) {
    if (status === 'APPROVED_FREIGHT' || status === 'REJECTED_FREIGHT') {
      order.viewedBy = [];
      if (status === 'APPROVED_FREIGHT') {
        order.status = 'DISPATCH_READY';
      } else {
        order.status = 'LOGISTICS_PENDING';
      }
      
      // Push status transition to history
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: order.status,
        updatedBy: req.user?._id || req.user?.userId || req.user?.id,
        updatedByName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : (req.user?.name || req.user?.email || 'User'),
        remarks: remarks || `Freight cost for vehicle ${dispatch.vehicleNumber} ${status === 'APPROVED_FREIGHT' ? 'approved' : 'rejected'} by MD.`,
        updatedAt: new Date()
      });

      // Send notifications for freight approval/rejection
      if (status === 'APPROVED_FREIGHT') {
        if (order.assignedLogisticsId) {
          await createNotification({
            userId: order.assignedLogisticsId,
            title: 'Freight Approved',
            message: `Freight cost for vehicle ${dispatch.vehicleNumber} has been approved by MD.`,
            type: 'FREIGHT_APPROVED',
            orderId: order._id
          });
          await createNotification({
            userId: order.assignedLogisticsId,
            title: 'Order Ready to Dispatch',
            message: `Order ${order.orderNumber} is now ready to dispatch.`,
            type: 'READY_TO_DISPATCH',
            orderId: order._id
          });
        }
      } else {
        if (order.assignedLogisticsId) {
          await createNotification({
            userId: order.assignedLogisticsId,
            title: 'Freight Rejected',
            message: `Freight cost for vehicle ${dispatch.vehicleNumber} has been rejected by MD. Remarks: ${remarks || ''}`,
            type: 'FREIGHT_REJECTED',
            orderId: order._id
          });
        }
      }
    } else if (dispatch.status === 'FREIGHT_APPROVAL_PENDING') {
      order.status = 'FREIGHT_APPROVAL_PENDING';
      order.viewedBy = [];
      await notifyRole({
        roleName: 'md',
        userType: 'MD',
        title: 'Freight Approval Awaiting Review',
        message: `Freight cost for order ${order.orderNumber} (vehicle ${dispatch.vehicleNumber}) is waiting for MD approval.`,
        type: 'AWAITING_FREIGHT_APPROVAL',
        orderId: order._id
      });
    } else if (dispatch.status === 'DISPATCHED' || dispatch.status === 'IN_TRANSIT') {
      order.status = 'SHIPPED';
      order.viewedBy = [];
    } else if (dispatch.status === 'DELIVERED') {
      // Only mark order DELIVERED if all dispatches of this order are DELIVERED
      const otherDispatches = await Dispatch.find({
        orderId: order._id,
        _id: { $ne: dispatch._id }
      });
      const allDelivered = otherDispatches.every(d => d.status === 'DELIVERED');
      if (allDelivered) {
        order.status = 'DELIVERED';
        order.viewedBy = [];
        
        // Notify Sales Executive and MD
        await createNotification({
          userId: order.salesExecutiveId,
          title: 'Order Delivered',
          message: `Your order ${order.orderNumber} has been delivered.`,
          type: 'DELIVERED',
          orderId: order._id
        });
        await notifyRole({
          roleName: 'md',
          userType: 'MD',
          title: 'Order Delivered',
          message: `Order ${order.orderNumber} has been delivered.`,
          type: 'DELIVERED',
          orderId: order._id
        });
      } else {
        order.status = 'SHIPPED';
      }
    }
    await order.save();
  }

  res.status(200).json({
    success: true,
    data: dispatch
  });
});

// @desc    Record transporter payment details
// @route   PUT /api/v1/dispatches/:id/payment
// @access  Private (Accounts / Admin / MD)
const updateDispatchPayment = asyncHandler(async (req, res) => {
  const { transporterPaymentRemarks, transporterPaymentProofUrl } = req.body;
  
  let dispatch = await Dispatch.findById(req.params.id);
  
  if (!dispatch) {
    res.status(404);
    throw new Error('Dispatch not found');
  }
  
  dispatch.transporterPaymentStatus = 'PAID';
  dispatch.transporterPaymentDate = new Date();
  if (transporterPaymentRemarks) dispatch.transporterPaymentRemarks = transporterPaymentRemarks;
  if (transporterPaymentProofUrl) dispatch.transporterPaymentProofUrl = transporterPaymentProofUrl;
  
  await dispatch.save();
  
  res.status(200).json({
    success: true,
    data: dispatch
  });
});

module.exports = {
  createDispatch,
  getDispatches,
  getDispatch,
  updateDispatchStatus,
  updateDispatchPayment
};
