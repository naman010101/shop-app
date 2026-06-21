const express = require('express');
const { body } = require('express-validator');
const { login, logout, getMe, changePassword, changeUsername } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], changePassword);

router.put('/change-username', authenticate, [
  body('newUsername').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
], changeUsername);

module.exports = router;
