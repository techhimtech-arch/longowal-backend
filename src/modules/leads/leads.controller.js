const asyncHandler = require('express-async-handler');
const Lead = require('../../models/Lead');
const logger = require('../../config/logger');

// @desc    Create a new lead
// @route   POST /api/v1/leads
// @access  Private (Sales/Admin)
const createLead = asyncHandler(async (req, res) => {
  const leadData = req.body;
  
  // Assign the lead to the user creating it if not explicitly assigned
  if (!leadData.assignedExecutiveId) {
    leadData.assignedExecutiveId = req.user.id; // assuming auth middleware sets req.user
  }

  const lead = await Lead.create(leadData);
  
  res.status(201).json({
    success: true,
    data: lead
  });
});

// @desc    Get all leads
// @route   GET /api/v1/leads
// @access  Private
const getLeads = asyncHandler(async (req, res) => {
  const { state, city, status, leadSource, assignedExecutiveId } = req.query;
  
  let query = {};
  
  if (state) query['address.state'] = state;
  if (city) query['address.city'] = city;
  if (status) query.status = status;
  if (leadSource) query.leadSource = leadSource;
  
  // If user is SALES, they only see their own leads. MD/Admin sees all.
  // Assuming req.user has userType
  if (req.user && req.user.userType === 'SALES_EXECUTIVE') {
    query.assignedExecutiveId = req.user.id;
  } else if (assignedExecutiveId) {
    query.assignedExecutiveId = assignedExecutiveId;
  }

  const leads = await Lead.find(query)
    .populate('assignedExecutiveId', 'firstName lastName email')
    .sort('-createdAt');
    
  res.status(200).json({
    success: true,
    count: leads.length,
    data: leads
  });
});

// @desc    Get single lead
// @route   GET /api/v1/leads/:id
// @access  Private
const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assignedExecutiveId', 'firstName lastName email');
    
  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }
  
  // Security check: sales can only see their own leads
  if (req.user.userType === 'SALES_EXECUTIVE' && lead.assignedExecutiveId.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to access this lead');
  }

  res.status(200).json({
    success: true,
    data: lead
  });
});

// @desc    Update lead
// @route   PUT /api/v1/leads/:id
// @access  Private
const updateLead = asyncHandler(async (req, res) => {
  let lead = await Lead.findById(req.params.id);
  
  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }
  
  if (req.user.userType === 'SALES_EXECUTIVE' && lead.assignedExecutiveId.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to update this lead');
  }

  lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: lead
  });
});

// @desc    Add followup to lead
// @route   POST /api/v1/leads/:id/followups
// @access  Private
const addFollowup = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  
  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }
  
  if (req.user.userType === 'SALES_EXECUTIVE' && lead.assignedExecutiveId.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to update this lead');
  }
  
  const followup = {
    date: req.body.date || Date.now(),
    type: req.body.type,
    outcome: req.body.outcome,
    notes: req.body.notes,
    nextFollowupDate: req.body.nextFollowupDate
  };
  
  lead.followups.push(followup);
  
  // Update status based on followup if provided
  if (req.body.status) {
    lead.status = req.body.status;
  }
  
  await lead.save();

  res.status(200).json({
    success: true,
    data: lead
  });
});

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  addFollowup
};
