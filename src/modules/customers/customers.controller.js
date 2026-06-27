const asyncHandler = require('express-async-handler');
const Customer = require('../../models/Customer');

// @desc    Create a new customer
// @route   POST /api/v1/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  // Generate a random customer code if not provided
  if (!req.body.customerCode) {
    req.body.customerCode = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
  }

  const customer = await Customer.create(req.body);
  
  res.status(201).json({
    success: true,
    data: customer
  });
});

// @desc    Get all customers
// @route   GET /api/v1/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find().sort('-createdAt');
  
  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers
  });
});

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
  let customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: customer
  });
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer
};
