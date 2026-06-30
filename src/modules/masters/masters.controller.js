const MasterData = require('../../models/MasterData');
const asyncHandler = require('express-async-handler');

// @desc    Create new master entry
// @route   POST /api/v1/masters
// @access  Private (Superadmin, Admin, MD)
const createMasterEntry = asyncHandler(async (req, res) => {
  const { category, key, value, remarks, isActive } = req.body;
  
  if (!category || !key || value === undefined) {
    res.status(400);
    throw new Error('Category, key and value are required');
  }

  // Check for duplicates
  const existing = await MasterData.findOne({ category, key });
  if (existing) {
    res.status(400);
    throw new Error(`Master entry for category "${category}" with key "${key}" already exists`);
  }

  const master = await MasterData.create({
    category,
    key,
    value,
    remarks,
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json({
    success: true,
    message: 'Master entry created successfully',
    data: master
  });
});

// @desc    Get master entries with optional category filtering
// @route   GET /api/v1/masters
// @access  Private
const getMasterEntries = asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.query.category) {
    filter.category = req.query.category;
  }
  
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  } else {
    // By default, only return active master entries
    filter.isActive = true;
  }

  const masters = await MasterData.find(filter).sort({ key: 1 });

  res.status(200).json({
    success: true,
    data: masters
  });
});

// @desc    Update master entry
// @route   PUT /api/v1/masters/:id
// @access  Private (Superadmin, Admin, MD)
const updateMasterEntry = asyncHandler(async (req, res) => {
  const { key, value, remarks, isActive } = req.body;
  
  let master = await MasterData.findById(req.params.id);
  if (!master) {
    res.status(404);
    throw new Error('Master entry not found');
  }

  if (key) master.key = key;
  if (value !== undefined) master.value = value;
  if (remarks !== undefined) master.remarks = remarks;
  if (isActive !== undefined) master.isActive = isActive;

  await master.save();

  res.status(200).json({
    success: true,
    message: 'Master entry updated successfully',
    data: master
  });
});

// @desc    Delete master entry
// @route   DELETE /api/v1/masters/:id
// @access  Private (Superadmin, Admin, MD)
const deleteMasterEntry = asyncHandler(async (req, res) => {
  const master = await MasterData.findById(req.params.id);
  if (!master) {
    res.status(404);
    throw new Error('Master entry not found');
  }

  await master.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Master entry deleted successfully'
  });
});

module.exports = {
  createMasterEntry,
  getMasterEntries,
  updateMasterEntry,
  deleteMasterEntry
};
