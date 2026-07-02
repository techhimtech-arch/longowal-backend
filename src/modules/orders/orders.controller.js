const asyncHandler = require('express-async-handler');
const Order = require('../../models/Order');
const { createNotification, notifyRole } = require('../../utils/notification');

// Helper to check if user has access to a specific order
const hasOrderAccess = (order, user) => {
  const role = (user.role || '').toLowerCase().replace(/[\s_-]/g, '');
  const userType = user.userType;
  
  const isSuperAdmin = userType === 'SUPER_ADMIN' || role === 'superadmin' || role === 'admin';
  const isMD = userType === 'MD' || role === 'md' || role === 'cmd' || role === 'managingdirector';
  
  if (isSuperAdmin || isMD) return true;
  
  const isSales = userType === 'SALES_EXECUTIVE' || role === 'salesexecutive' || role === 'sales' || role === 'orgadmin';
  if (isSales && order.salesExecutiveId) {
    const salesExecId = order.salesExecutiveId._id ? order.salesExecutiveId._id : order.salesExecutiveId;
    return salesExecId.toString() === (user.userId || user.id || user._id).toString();
  }
  
  const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
  if (isLogistics && order.assignedLogisticsId) {
    const logisticsStatuses = ['LOGISTICS_PENDING', 'FREIGHT_APPROVAL_PENDING', 'DISPATCH_READY', 'PACKED', 'SHIPPED', 'DELIVERED', 'SENT_TO_ACCOUNTS', 'INVOICE_GENERATED', 'PAYMENT_PENDING', 'PARTIAL_PAYMENT', 'PAID', 'COMPLETED'];
    if (!logisticsStatuses.includes(order.status)) return false;
    
    const logisticsId = order.assignedLogisticsId._id ? order.assignedLogisticsId._id : order.assignedLogisticsId;
    return logisticsId.toString() === (user.userId || user.id || user._id).toString();
  }
  
  const isAccounts = userType === 'CITIZEN' || role === 'accounts' || role === 'accountant';
  if (isAccounts) {
    const accountsStatuses = ['SENT_TO_ACCOUNTS', 'INVOICE_GENERATED', 'PAYMENT_PENDING', 'PARTIAL_PAYMENT', 'PAID', 'COMPLETED'];
    return accountsStatuses.includes(order.status);
  }
  
  return false;
};

// @desc    Create a new order
// @route   POST /api/v1/orders
// @access  Private (Sales)
const createOrder = asyncHandler(async (req, res) => {
  // Validate role
  if (req.user) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    
    const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
    const isAccounts = userType === 'CITIZEN' || role === 'accounts' || role === 'accountant';
    
    if (isLogistics || isAccounts) {
      res.status(403);
      throw new Error('Insufficient permissions: Logistics and Accounts users are not allowed to create orders');
    }
  }

  const orderData = req.body;

  // Validate that a logistics person is assigned if status is not DRAFT
  if (orderData.status && orderData.status !== 'DRAFT' && !orderData.assignedLogisticsId) {
    res.status(400);
    throw new Error('Please select an Assigned Logistics Person before confirming the order.');
  }
  
  // Enforce Mandatory Field Validation
  if (orderData.status !== 'DRAFT') {
    const missingFields = [];
    
    // Section 1
    if (!orderData.customerId) missingFields.push('customerId');
    if (!orderData.executionFirmId) missingFields.push('executionFirmId');
    if (!orderData.salesExecutiveId && !req.user.userId && !req.user._id && !req.user.id) missingFields.push('salesExecutiveId');
    
    // Section 2
    if (!orderData.products || orderData.products.length === 0) {
      missingFields.push('products');
    } else {
      for (const p of orderData.products) {
        if (!p.productName || !p.quantity || !p.unit || p.supplyRate === undefined || p.supplyRate === null || p.freight === undefined || p.freight === null || p.margin === undefined || p.margin === null || p.gstPercent === undefined || p.gstPercent === null || p.rate === undefined || p.rate === null) {
          missingFields.push('products (incomplete rows)');
          break;
        }
      }
    }
    
    // Section 3
    if (!orderData.deliveryAddress) missingFields.push('deliveryAddress');
    if (!orderData.dispatchLocation) missingFields.push('dispatchLocation');
    if (orderData.estimatedFreight === undefined || orderData.estimatedFreight === null || String(orderData.estimatedFreight) === "") missingFields.push('estimatedFreight');
    
    // Section 4
    if (!orderData.expectedPaymentDate) missingFields.push('expectedPaymentDate');
    
    if (missingFields.length > 0) {
      res.status(400);
      throw new Error(`Validation failed. Missing mandatory fields: ${missingFields.join(', ')}`);
    }
  }

  
  // Assign a unique order number
  if (!orderData.orderNumber) {
    orderData.orderNumber = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
  }
  
  if (!orderData.salesExecutiveId) {
    orderData.salesExecutiveId = req.user.userId || req.user._id || req.user.id;
  }
  
  // Set initial status history
  orderData.statusHistory = [{
    status: orderData.status || 'DRAFT',
    updatedBy: req.user._id || req.user.userId || req.user.id,
    updatedByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : (req.user.name || req.user.email || 'System'),
    remarks: 'Order created',
    updatedAt: new Date()
  }];

  // Initial assignment makes it unread for other relevant users
  orderData.viewedBy = [req.user.userId || req.user.id];
  
  // Create order
  const order = await Order.create(orderData);

  // Trigger MD notification if submitted for approval
  if (order.status === 'PENDING_MD_APPROVAL') {
    await notifyRole({
      roleName: 'md',
      userType: 'MD',
      title: 'New Order Awaiting Approval',
      message: `Order ${order.orderNumber} has been submitted for MD approval.`,
      type: 'NEW_ORDER',
      orderId: order._id
    });
  }
  
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
  if (req.user) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    
    const isSales = userType === 'SALES_EXECUTIVE' || role === 'salesexecutive' || role === 'sales' || role === 'orgadmin';
    const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
    const isAccounts = userType === 'CITIZEN' || role === 'accounts' || role === 'accountant';
    const isMD = userType === 'MD' || role === 'md' || role === 'cmd' || role === 'managingdirector';
    const isSuperAdmin = userType === 'SUPER_ADMIN' || role === 'superadmin' || role === 'admin';
    
    if (isSales) {
      query.salesExecutiveId = req.user.userId || req.user.id || req.user._id;
    } else if (isLogistics) {
      // Logistics team should only see orders that are approved or beyond and are explicitly assigned to them!
      query.assignedLogisticsId = req.user.userId || req.user.id || req.user._id;
      query.status = { $in: ['LOGISTICS_PENDING', 'FREIGHT_APPROVAL_PENDING', 'DISPATCH_READY', 'PACKED', 'SHIPPED', 'DELIVERED', 'SENT_TO_ACCOUNTS', 'INVOICE_GENERATED', 'PAYMENT_PENDING', 'PARTIAL_PAYMENT', 'PAID', 'COMPLETED'] };
    } else if (isAccounts) {
      // Accounts team should only see orders that have been sent to accounts
      query.status = { $in: ['SENT_TO_ACCOUNTS', 'INVOICE_GENERATED', 'PAYMENT_PENDING', 'PARTIAL_PAYMENT', 'PAID', 'COMPLETED'] };
    }
  }
  
  // Additional filters from query params
  if (req.query.status) query.status = req.query.status;
  if (req.query.customerId) query.customerId = req.query.customerId;
  if (req.query.executionFirmId) query.executionFirmId = req.query.executionFirmId;

  const orders = await Order.find(query)
    .populate('customerId', 'companyName customerCode')
    .populate('executionFirmId', 'firmName')
    .populate('salesExecutiveId', 'firstName lastName')
    .populate('assignedLogisticsId', 'firstName lastName')
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
    .populate('salesExecutiveId', 'firstName lastName email')
    .populate('assignedLogisticsId', 'firstName lastName email');
    
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Access validation
  if (req.user && !hasOrderAccess(order, req.user)) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
    if (isLogistics) {
      res.status(404);
      throw new Error('Order not found');
    }
    res.status(403);
    throw new Error('Insufficient permissions: You are not authorized to view this order.');
  }

  // Append user to viewedBy list if not present, and save
  if (req.user) {
    const currentUserId = req.user.userId || req.user.id || req.user._id;
    if (currentUserId && order.viewedBy && !order.viewedBy.some(id => id.toString() === currentUserId.toString())) {
      await Order.updateOne({ _id: order._id }, { $push: { viewedBy: currentUserId } });
      order.viewedBy.push(currentUserId);
    }
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

  // Access validation
  if (req.user && !hasOrderAccess(order, req.user)) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
    if (isLogistics) {
      res.status(404);
      throw new Error('Order not found');
    }
    res.status(403);
    throw new Error('Insufficient permissions: You are not authorized to update status for this order.');
  }

  // Enforce logistics assignment validation
  const newStatus = status === 'APPROVED_FREIGHT' || status === 'REJECTED_FREIGHT' ? 'LOGISTICS_PENDING' : status;
  if (newStatus && newStatus !== 'DRAFT' && newStatus !== 'REJECTED' && newStatus !== 'CANCELLED' && !order.assignedLogisticsId) {
    res.status(400);
    throw new Error('Please select an Assigned Logistics Person before confirming the order.');
  }
  
  // Push status transition to history
  if (!order.statusHistory) {
    order.statusHistory = [];
  }

  // Reset viewedBy for new status change
  const oldStatus = order.status;
  if (status && status !== oldStatus) {
    order.viewedBy = [];
  }
  
  if (status === 'APPROVED_FREIGHT') {
    order.status = 'LOGISTICS_PENDING';
    if (!order.logistics) {
      order.logistics = {};
    }
    order.logistics.isFreightApproved = true;
    
    order.statusHistory.push({
      status: 'LOGISTICS_PENDING',
      updatedBy: req.user._id || req.user.userId || req.user.id,
      updatedByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : (req.user.name || req.user.email || 'User'),
      remarks: remarks || `Freight cost of ₹${order.logistics?.freightCost || 0} approved by MD.`,
      updatedAt: new Date()
    });
  } else if (status === 'REJECTED_FREIGHT') {
    order.status = 'LOGISTICS_PENDING';
    if (!order.logistics) {
      order.logistics = {};
    }
    order.logistics.isFreightApproved = false;
    
    order.statusHistory.push({
      status: 'LOGISTICS_PENDING',
      updatedBy: req.user._id || req.user.userId || req.user.id,
      updatedByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : (req.user.name || req.user.email || 'User'),
      remarks: remarks || `Freight cost of ₹${order.logistics?.freightCost || 0} rejected by MD.`,
      updatedAt: new Date()
    });
  } else {
    order.status = status;
    if (remarks) order.remarks = remarks;
    
    if (status === 'REJECTED' && req.body.materialAdjustment) {
      order.materialAdjustment = {
        ...req.body.materialAdjustment,
        adjustedAt: new Date(),
        adjustedBy: req.user._id || req.user.userId || req.user.id
      };
    }
    
    order.statusHistory.push({
      status,
      updatedBy: req.user._id || req.user.userId || req.user.id,
      updatedByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : (req.user.name || req.user.email || 'User'),
      remarks: remarks || `Status updated to ${status}`,
      updatedAt: new Date()
    });
  }
  
  await order.save();

  // Trigger notifications on status changes
  if (status === 'PENDING_MD_APPROVAL') {
    await notifyRole({
      roleName: 'md',
      userType: 'MD',
      title: 'New Order Awaiting Approval',
      message: `Order ${order.orderNumber} has been submitted for MD approval.`,
      type: 'NEW_ORDER',
      orderId: order._id
    });
  } else if (status === 'APPROVED') {
    await createNotification({
      userId: order.salesExecutiveId,
      title: 'Order Approved',
      message: `Your order ${order.orderNumber} has been approved by MD.`,
      type: 'ORDER_APPROVED',
      orderId: order._id
    });
  } else if (status === 'APPROVED_FREIGHT' && order.assignedLogisticsId) {
    await createNotification({
      userId: order.assignedLogisticsId,
      title: 'Freight Approved',
      message: `Freight approved for Order ${order.orderNumber}. You can now proceed with dispatch.`,
      type: 'FREIGHT_APPROVED',
      orderId: order._id
    });
  } else if (status === 'REJECTED_FREIGHT' && order.assignedLogisticsId) {
    await createNotification({
      userId: order.assignedLogisticsId,
      title: 'Freight Rejected',
      message: `Freight rejected for Order ${order.orderNumber}. Please update the trip plan.`,
      type: 'FREIGHT_REJECTED',
      orderId: order._id
    });
  } else if (status === 'SENT_TO_ACCOUNTS') {
    await notifyRole({
      roleName: 'accounts',
      userType: 'CITIZEN',
      title: 'Order Sent to Accounts',
      message: `Order ${order.orderNumber} has been delivered and sent to Accounts for payment processing.`,
      type: 'SENT_TO_ACCOUNTS',
      orderId: order._id
    });
  }

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

  // Access validation
  if (req.user) {
    if (!hasOrderAccess(order, req.user)) {
      const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
      const userType = req.user.userType;
      const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
      if (isLogistics) {
        res.status(404);
        throw new Error('Order not found');
      }
      res.status(403);
      throw new Error('Insufficient permissions: You are not authorized to update logistics for this order.');
    }
    
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    const isSales = userType === 'SALES_EXECUTIVE' || role === 'salesexecutive' || role === 'sales' || role === 'orgadmin';
    if (isSales) {
      res.status(403);
      throw new Error('Insufficient permissions: Sales Executives are not allowed to update logistics details.');
    }
  }

  // Reset viewedBy for new status change
  const oldStatus = order.status;
  if (status && status !== oldStatus) {
    order.viewedBy = [];
  }
  
  order.logistics = { ...order.logistics, ...logistics };
  if (status) order.status = status; // Typically updates to FREIGHT_APPROVAL_PENDING or DISPATCH_READY
  
  await order.save();

  if (status === 'FREIGHT_APPROVAL_PENDING') {
    await notifyRole({
      roleName: 'md',
      userType: 'MD',
      title: 'Freight Approval Required',
      message: `Freight Approval Required for Order ${order.orderNumber}.`,
      type: 'FREIGHT_APPROVAL_REQUIRED',
      orderId: order._id
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update order details
// @route   PUT /api/v1/orders/:id
// @access  Private (Admin)
const updateOrder = asyncHandler(async (req, res) => {
  let order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Access validation
  if (req.user) {
    const role = (req.user.role || '').toLowerCase().replace(/[\s_-]/g, '');
    const userType = req.user.userType;
    
    const isSuperAdmin = userType === 'SUPER_ADMIN' || role === 'superadmin' || role === 'admin';
    const isMD = userType === 'MD' || role === 'md' || role === 'cmd' || role === 'managingdirector';
    const isSales = userType === 'SALES_EXECUTIVE' || role === 'salesexecutive' || role === 'sales' || role === 'orgadmin';
    
    let isAuthorized = isSuperAdmin || isMD;
    if (isSales && order.salesExecutiveId.toString() === (req.user.userId || req.user.id).toString()) {
      isAuthorized = true;
    }
    
    if (!isAuthorized) {
      const isLogistics = userType === 'LOGISTICS_TEAM' || role === 'logistics' || role === 'logisticsteam';
      if (isLogistics) {
        res.status(404);
        throw new Error('Order not found');
      }
      res.status(403);
      throw new Error('Insufficient permissions: You are not authorized to edit this order.');
    }

    // Sales Executive edit lock
    if (isSales) {
      const lockedStatuses = ['APPROVED', 'LOGISTICS_PENDING', 'FREIGHT_APPROVAL_PENDING', 'DISPATCH_READY', 'PACKED', 'SHIPPED', 'DELIVERED', 'SENT_TO_ACCOUNTS', 'INVOICE_GENERATED', 'PAYMENT_PENDING', 'PARTIAL_PAYMENT', 'PAID', 'COMPLETED'];
      if (lockedStatuses.includes(order.status) || order.assignedLogisticsId) {
        res.status(403);
        throw new Error('Locked: Sales Executives cannot edit orders after approval or logistics assignment.');
      }
    }
  }

  const oldAssignedLogisticsId = order.assignedLogisticsId;

  // Update order fields
  const allowedUpdates = [
    'customerId', 'executionFirmId', 'salesExecutiveId', 'orderDate', 
    'expectedPaymentDate', 'products', 'deliveryAddress', 'dispatchLocation', 
    'plantName', 'requiredDeliveryDate', 'estimatedFreight', 'advanceAmount',
    'status', 'remarks', 'assignedLogisticsId'
  ];

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      order[field] = req.body[field];
    }
  });

  // Clear viewedBy if a new logistics person is assigned to trigger unread indicator for them
  if (req.body.assignedLogisticsId !== undefined) {
    order.viewedBy = [];
  }

  // Enforce logistics assignment validation if status is not DRAFT
  if (order.status !== 'DRAFT' && !order.assignedLogisticsId) {
    res.status(400);
    throw new Error('Please select an Assigned Logistics Person before confirming the order.');
  }

  await order.save();

  // Populate references before sending back
  order = await Order.findById(order._id)
    .populate('customerId')
    .populate('executionFirmId')
    .populate('salesExecutiveId', 'firstName lastName email')
    .populate('assignedLogisticsId', 'firstName lastName email');

  // Trigger logistics assignment notification
  if (req.body.assignedLogisticsId && (!oldAssignedLogisticsId || oldAssignedLogisticsId.toString() !== req.body.assignedLogisticsId.toString())) {
    const logisticsStatuses = ['LOGISTICS_PENDING', 'FREIGHT_APPROVAL_PENDING', 'DISPATCH_READY', 'PACKED', 'SHIPPED', 'DELIVERED'];
    if (logisticsStatuses.includes(order.status)) {
      await createNotification({
        userId: order.assignedLogisticsId,
        title: 'New Order Assigned for Logistics',
        message: `You have been assigned to order ${order.orderNumber} for trip planning.`,
        type: 'LOGISTICS_ASSIGNED',
        orderId: order._id
      });
    }
  }

  // Trigger MD notification if status updated to PENDING_MD_APPROVAL
  if (req.body.status === 'PENDING_MD_APPROVAL' && order.status === 'PENDING_MD_APPROVAL') {
    await notifyRole({
      roleName: 'md',
      userType: 'MD',
      title: 'New Order Awaiting Approval',
      message: `Order ${order.orderNumber} has been submitted for MD approval.`,
      type: 'NEW_ORDER',
      orderId: order._id
    });
  }

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
  updateOrderLogistics,
  updateOrder
};
