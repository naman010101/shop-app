const express = require('express');
const { body } = require('express-validator');
const { getAll, create, update, remove, resetPassword } = require('../controllers/usersController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('OWNER'));

router.get('/', getAll);

router.post('/', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['OWNER', 'STAFF']).withMessage('Role must be OWNER or STAFF'),
], create);

router.put('/:id', [
  body('username').optional().trim().isLength({ min: 3 }),
  body('role').optional().isIn(['OWNER', 'STAFF']),
], update);

router.delete('/:id', remove);

router.post('/:id/reset-password', [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], resetPassword);

module.exports = router;
