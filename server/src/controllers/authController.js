const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const normalizedUsername = (username || '').trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: normalizedUsername,
          mode: 'insensitive',
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or account deactivated.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        tableName: 'User',
        recordId: user.id,
        details: { username: user.username },
        userId: user.id,
      },
    });

    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const changeUsername = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newUsername } = req.body;
    const trimmed = newUsername.trim().toLowerCase();

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        username: {
          equals: trimmed,
          mode: 'insensitive',
        },
      },
    });
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { username: trimmed },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CHANGE_USERNAME',
        tableName: 'User',
        recordId: req.user.id,
        details: { oldUsername: req.user.username, newUsername: trimmed },
        userId: req.user.id,
      },
    });

    res.json({ message: 'Username changed successfully.', username: trimmed });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CHANGE_PASSWORD',
        tableName: 'User',
        recordId: req.user.id,
        details: {},
        userId: req.user.id,
      },
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout, getMe, changePassword, changeUsername };
