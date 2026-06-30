const {
  createDispatch,
  getDispatches,
  getDispatch,
  updateDispatchStatus,
  updateDispatchPayment
} = require('./dispatches.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Dispatches
 *   description: Dispatch management endpoints
 */

/**
 * @swagger
 * /api/v1/dispatches:
 *   get:
 *     summary: Get all dispatches
 *     tags: [Dispatches]
 *     responses:
 *       200:
 *         description: List of dispatches
 *   post:
 *     summary: Create a new dispatch
 *     tags: [Dispatches]
 *     responses:
 *       201:
 *         description: Created dispatch
 */
router
  .route('/')
  .get(getDispatches)
  .post(createDispatch);

/**
 * @swagger
 * /api/v1/dispatches/{id}:
 *   get:
 *     summary: Get dispatch by ID
 *     tags: [Dispatches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispatch details
 */
router
  .route('/:id')
  .get(getDispatch);

/**
 * @swagger
 * /api/v1/dispatches/{id}/status:
 *   put:
 *     summary: Update dispatch status
 *     tags: [Dispatches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated dispatch
 */
router.put('/:id/status', updateDispatchStatus);
router.put('/:id/payment', updateDispatchPayment);

module.exports = router;
