const express = require('express');
const { body } = require('express-validator');
const {
  getAllPartyDispatches,
  createPartyDispatch,
  updatePartyDispatch,
  deletePartyDispatch,
  getAllShopTransfers,
  createShopTransfer,
  updateShopTransfer,
  deleteShopTransfer,
  getWarehouseActivityLogs
} = require('../controllers/warehouseController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// All routes require authentication and are restricted to OWNER and WAREHOUSE_MGMT roles
router.use(authenticate, authorize('OWNER', 'WAREHOUSE_MGMT'));

// ── Activity Logs Route (restricted to OWNER only) ───────────────────────────
router.get('/activity-logs', authorize('OWNER'), getWarehouseActivityLogs);

// ── Party Dispatch Routes ────────────────────────────────────────────────────
router.get('/party-dispatch', getAllPartyDispatches);

router.post('/party-dispatch', [
  body('bill_number').trim().notEmpty().withMessage('Bill number is required'),
  body('challan_number').trim().notEmpty().withMessage('Challan number is required'),
  body('party_name').trim().notEmpty().withMessage('Party name is required'),
  body('item_name').trim().notEmpty().withMessage('Item/Product name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('slip_number').trim().notEmpty().withMessage('Slip number is required'),
  body('by_person').trim().notEmpty().withMessage('Operator/Person name is required'),
], createPartyDispatch);

router.put('/party-dispatch/:id', [
  body('bill_number').optional().trim().notEmpty(),
  body('challan_number').optional().trim().notEmpty(),
  body('party_name').optional().trim().notEmpty(),
  body('item_name').optional().trim().notEmpty(),
  body('quantity').optional().isInt({ min: 1 }),
  body('slip_number').optional().trim().notEmpty(),
  body('by_person').optional().trim().notEmpty(),
], updatePartyDispatch);

router.delete('/party-dispatch/:id', deletePartyDispatch);

// ── Shop Transfer Routes ─────────────────────────────────────────────────────
router.get('/shop-transfer', getAllShopTransfers);

router.post('/shop-transfer', [
  body('item_name').trim().notEmpty().withMessage('Item/Product name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('slip_number').trim().notEmpty().withMessage('Slip number is required'),
  body('by_person').trim().notEmpty().withMessage('Operator/Person name is required'),
], createShopTransfer);

router.put('/shop-transfer/:id', [
  body('item_name').optional().trim().notEmpty(),
  body('quantity').optional().isInt({ min: 1 }),
  body('slip_number').optional().trim().notEmpty(),
  body('by_person').optional().trim().notEmpty(),
], updateShopTransfer);

router.delete('/shop-transfer/:id', deleteShopTransfer);

module.exports = router;
