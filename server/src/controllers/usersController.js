const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { username, passwordHash, role: role || 'STAFF' },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        tableName: 'User',
        recordId: user.id,
        details: { username, role },
        userId: req.user.id,
      },
    });

    res.status(201).json({ message: 'User created successfully.', user });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { username, role, isActive } = req.body;

    if (id === req.user.id && isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(username && { username }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER',
        tableName: 'User',
        recordId: id,
        details: req.body,
        userId: req.user.id,
      },
    });

    res.json({ message: 'User updated successfully.', user });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // Soft delete - deactivate instead of hard delete to preserve audit logs
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER',
        tableName: 'User',
        recordId: id,
        details: {},
        userId: req.user.id,
      },
    });

    res.json({ message: 'User deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { newPassword } = req.body;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        action: 'RESET_PASSWORD',
        tableName: 'User',
        recordId: id,
        details: {},
        userId: req.user.id,
      },
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, resetPassword };
