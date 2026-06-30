const express = require('express');
const {
  createMasterEntry,
  getMasterEntries,
  updateMasterEntry,
  deleteMasterEntry
} = require('./masters.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET is accessible by any authenticated user for drop-down selects
router.get('/', getMasterEntries);

// POST, PUT, DELETE are restricted to Admin/Superadmin/MD roles
router.post('/', authorizeRoles('superadmin', 'admin', 'md', 'managingdirector'), createMasterEntry);
router.put('/:id', authorizeRoles('superadmin', 'admin', 'md', 'managingdirector'), updateMasterEntry);
router.delete('/:id', authorizeRoles('superadmin', 'admin', 'md', 'managingdirector'), deleteMasterEntry);

module.exports = router;
