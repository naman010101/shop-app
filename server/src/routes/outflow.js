const express = require('express');
const { body } = require('express-validator');
const { getAll, create, update, remove } = require('../controllers/outflowController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('OWNER', 'CASHIER'));

router.get('/', getAll);

router.post('/', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
], create);

router.put('/:id', [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reason').optional().trim().notEmpty(),
], update);

router.delete('/:id', remove);

module.exports = router;
