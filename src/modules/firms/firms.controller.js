const asyncHandler = require('express-async-handler');
const Firm = require('../../models/Firm');

// @desc    Create a new firm
// @route   POST /api/v1/firms
// @access  Private (Admin)
const createFirm = asyncHandler(async (req, res) => {
  const firm = await Firm.create(req.body);
  
  res.status(201).json({
    success: true,
    data: firm
  });
});

// @desc    Get all firms
// @route   GET /api/v1/firms
// @access  Private
const getFirms = asyncHandler(async (req, res) => {
  const firms = await Firm.find({ status: 'ACTIVE' }).sort('-createdAt');
  
  res.status(200).json({
    success: true,
    count: firms.length,
    data: firms
  });
});

// @desc    Get single firm
// @route   GET /api/v1/firms/:id
// @access  Private
const getFirm = asyncHandler(async (req, res) => {
  const firm = await Firm.findById(req.params.id);
  
  if (!firm) {
    res.status(404);
    throw new Error('Firm not found');
  }

  res.status(200).json({
    success: true,
    data: firm
  });
});

// @desc    Update firm
// @route   PUT /api/v1/firms/:id
// @access  Private (Admin)
const updateFirm = asyncHandler(async (req, res) => {
  let firm = await Firm.findById(req.params.id);
  
  if (!firm) {
    res.status(404);
    throw new Error('Firm not found');
  }

  firm = await Firm.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: firm
  });
});

module.exports = {
  createFirm,
  getFirms,
  getFirm,
  updateFirm
};
