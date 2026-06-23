const express = require('express');
const { body } = require('express-validator');
const {
  getTodayBalance,
  createOpening,
  createClosing,
  adminGetAll,
  adminVerify,
  adminUpdate,
  getAuditLogs
} = require('../controllers/balanceController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// All routes require authentication and are restricted to OWNER and CASHIER
router.use(authenticate, authorize('OWNER', 'CASHIER'));

// Staff and Admin routes for shift entries
router.get('/today', getTodayBalance);
router.post('/opening', [
  body('openingBalance').isFloat({ min: 0 }).withMessage('Opening balance must be a non-negative number')
], createOpening);
router.post('/closing', [
  body('closingBalance').isFloat({ min: 0 }).withMessage('Closing balance must be a non-negative number')
], createClosing);

// Admin-only middleware
const requireOwner = (req, res, next) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
  }
  next();
};

// Shared listing route (enforces self-only view for staff in controller)
router.get('/list', adminGetAll);

// Admin actions
router.put('/admin/verify/:id', requireOwner, [
  body('status').trim().notEmpty().withMessage('Status is required'),
], adminVerify);
router.put('/admin/update/:id', requireOwner, [
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('Opening balance must be a non-negative number'),
  body('closingBalance').optional().isFloat({ min: 0 }).withMessage('Closing balance must be a non-negative number'),
], adminUpdate);
router.get('/admin/audit-logs', requireOwner, getAuditLogs);

module.exports = router;
