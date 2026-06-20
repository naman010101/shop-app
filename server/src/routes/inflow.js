const express = require('express');
const { body } = require('express-validator');
const { getAll, create, update, remove, checkSlip } = require('../controllers/inflowController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/check-slip', checkSlip);
router.get('/', getAll);

router.post('/', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('slipNumber').trim().notEmpty().withMessage('Slip number is required'),
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
], create);

router.put('/:id', [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('customerName').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
], update);

router.delete('/:id', remove);

module.exports = router;
