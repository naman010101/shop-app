const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { format } = require('date-fns');

const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, customerName, slipNumber, page = 1, limit = 20 } = req.query;
    const isOwner = req.user.role === 'OWNER';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (!isOwner) where.userId = req.user.id;
    else if (userId) where.userId = userId;
    if (customerName) where.customerName = { contains: customerName, mode: 'insensitive' };
    if (slipNumber) where.slipNumber = { contains: slipNumber, mode: 'insensitive' };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [records, total] = await Promise.all([
      prisma.cashInflow.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.cashInflow.count({ where }),
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

    const { amount, slipNumber, customerName, remarks } = req.body;
    const now = new Date();

    // Check duplicate slip number
    const existing = await prisma.cashInflow.findUnique({ where: { slipNumber } });
    if (existing) {
      return res.status(409).json({ error: `Slip number '${slipNumber}' already exists. Please use a unique slip number.` });
    }

    const record = await prisma.cashInflow.create({
      data: {
        amount: parseFloat(amount),
        slipNumber,
        customerName,
        remarks: remarks || null,
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm:ss'),
        userId: req.user.id,
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'CashInflow',
        recordId: record.id,
        details: { amount, slipNumber, customerName },
        userId: req.user.id,
      },
    });

    res.status(201).json({ message: 'Cash inflow recorded successfully.', record });
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
    const { amount, slipNumber, customerName, remarks } = req.body;

    // Check slip number uniqueness (exclude current record)
    if (slipNumber) {
      const existing = await prisma.cashInflow.findFirst({
        where: { slipNumber, id: { not: id } },
      });
      if (existing) {
        return res.status(409).json({ error: `Slip number '${slipNumber}' already exists.` });
      }
    }

    const record = await prisma.cashInflow.update({
      where: { id },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(slipNumber && { slipNumber }),
        ...(customerName && { customerName }),
        remarks: remarks !== undefined ? remarks || null : undefined,
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'CashInflow',
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
    await prisma.cashInflow.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'CashInflow',
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

const checkSlip = async (req, res, next) => {
  try {
    const { slipNumber } = req.query;
    if (!slipNumber) return res.json({ exists: false });
    const existing = await prisma.cashInflow.findUnique({ where: { slipNumber } });
    res.json({ exists: !!existing });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, checkSlip };
