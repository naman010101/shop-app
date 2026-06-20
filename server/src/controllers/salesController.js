const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { format } = require('date-fns');

const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, customerName, page = 1, limit = 20 } = req.query;
    const isOwner = req.user.role === 'OWNER';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (!isOwner) where.userId = req.user.id;
    else if (userId) where.userId = userId;
    if (customerName) where.customerName = { contains: customerName, mode: 'insensitive' };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [records, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({ records, total, page: parseInt(page), limit: parseInt(limit) });
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

    const { productName, amount, customerName, notes } = req.body;
    const now = new Date();

    const record = await prisma.sale.create({
      data: {
        productName,
        amount: parseFloat(amount),
        customerName,
        notes: notes || null,
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm:ss'),
        userId: req.user.id,
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'Sale',
        recordId: record.id,
        details: { productName, amount, customerName },
        userId: req.user.id,
      },
    });

    res.status(201).json({ message: 'Sale recorded successfully.', record });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the Owner can edit submitted records.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { productName, amount, customerName, notes } = req.body;

    const record = await prisma.sale.update({
      where: { id },
      data: {
        ...(productName && { productName }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(customerName && { customerName }),
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'Sale',
        recordId: id,
        details: req.body,
        userId: req.user.id,
      },
    });

    res.json({ message: 'Record updated successfully.', record });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the Owner can delete records.' });
    }

    const { id } = req.params;
    await prisma.sale.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'Sale',
        recordId: id,
        details: {},
        userId: req.user.id,
      },
    });

    res.json({ message: 'Record deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
