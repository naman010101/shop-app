const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const prisma = new PrismaClient();

const getTodayBalance = async (req, res, next) => {
  try {
    const { getISTDateTime } = require('../utils/timezone');
    const today = getISTDateTime().date;
    const userId = req.user.id;

    // Find today's balance record for the user
    const record = await prisma.balanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    // Aggregate user's inflows, sales, outflows for today
    const [inflowAgg, salesAgg, outflowAgg] = await Promise.all([
      prisma.cashInflow.aggregate({
        where: { userId, date: today },
        _sum: { amount: true }
      }),
      prisma.sale.aggregate({
        where: { userId, date: today },
        _sum: { amount: true }
      }),
      prisma.cashOutflow.aggregate({
        where: { userId, date: today },
        _sum: { amount: true }
      })
    ]);

    const totalInflow = parseFloat(inflowAgg._sum.amount || 0);
    const totalSales = parseFloat(salesAgg._sum.amount || 0);
    const totalOutflow = parseFloat(outflowAgg._sum.amount || 0);

    res.json({
      record: record ? {
        ...record,
        openingBalance: parseFloat(record.openingBalance),
        closingBalance: record.closingBalance !== null ? parseFloat(record.closingBalance) : null
      } : null,
      today,
      totals: {
        inflows: totalInflow,
        sales: totalSales,
        outflows: totalOutflow
      }
    });
  } catch (error) {
    next(error);
  }
};

const createOpening = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { openingBalance } = req.body;
    const { getISTDateTime } = require('../utils/timezone');
    const { date, time } = getISTDateTime();
    const userId = req.user.id;

    // Check if record already exists for today
    const existing = await prisma.balanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Opening balance has already been submitted for today/shift.' });
    }

    const record = await prisma.balanceRecord.create({
      data: {
        date,
        openingTime: time,
        openingBalance: parseFloat(openingBalance),
        userId
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'BalanceRecord',
        recordId: record.id,
        details: {
          openingBalance: parseFloat(openingBalance),
          date,
          time
        },
        userId
      }
    });

    res.status(201).json({
      message: 'Opening balance recorded successfully.',
      record: {
        ...record,
        openingBalance: parseFloat(record.openingBalance)
      }
    });
  } catch (error) {
    next(error);
  }
};

const createClosing = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { closingBalance } = req.body;
    const { getISTDateTime } = require('../utils/timezone');
    const { date, time } = getISTDateTime();
    const userId = req.user.id;

    // Find the record for today
    const record = await prisma.balanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });

    if (!record) {
      return res.status(400).json({ error: 'Please submit an opening balance first.' });
    }

    if (record.closingBalance !== null) {
      return res.status(400).json({ error: 'Closing balance has already been submitted for today/shift.' });
    }

    const updated = await prisma.balanceRecord.update({
      where: { id: record.id },
      data: {
        closingTime: time,
        closingBalance: parseFloat(closingBalance)
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'BalanceRecord',
        recordId: record.id,
        details: {
          closingBalance: parseFloat(closingBalance),
          date,
          time
        },
        userId
      }
    });

    res.json({
      message: 'Closing balance recorded successfully.',
      record: {
        ...updated,
        openingBalance: parseFloat(updated.openingBalance),
        closingBalance: parseFloat(updated.closingBalance)
      }
    });
  } catch (error) {
    next(error);
  }
};

const adminGetAll = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, status } = req.query;
    const isOwner = req.user.role === 'OWNER';

    const where = {};
    if (!isOwner) {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }
    
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const records = await prisma.balanceRecord.findMany({
      where,
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Populate actual aggregates and expected balance dynamically
    const formattedRecords = await Promise.all(
      records.map(async (record) => {
        const [inflowAgg, salesAgg, outflowAgg] = await Promise.all([
          prisma.cashInflow.aggregate({
            where: { userId: record.userId, date: record.date },
            _sum: { amount: true }
          }),
          prisma.sale.aggregate({
            where: { userId: record.userId, date: record.date },
            _sum: { amount: true }
          }),
          prisma.cashOutflow.aggregate({
            where: { userId: record.userId, date: record.date },
            _sum: { amount: true }
          })
        ]);

        const inflows = parseFloat(inflowAgg._sum.amount || 0);
        const sales = parseFloat(salesAgg._sum.amount || 0);
        const outflows = parseFloat(outflowAgg._sum.amount || 0);
        
        const openingBalance = parseFloat(record.openingBalance);
        const expectedClosingBalance = openingBalance + inflows + sales - outflows;
        const actualClosingBalance = record.closingBalance !== null ? parseFloat(record.closingBalance) : null;
        
        let variance = null;
        if (actualClosingBalance !== null) {
          variance = actualClosingBalance - expectedClosingBalance;
        }

        return {
          id: record.id,
          date: record.date,
          openingTime: record.openingTime,
          openingBalance,
          closingTime: record.closingTime,
          closingBalance: actualClosingBalance,
          status: record.status,
          remarks: record.remarks,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          userId: record.userId,
          user: record.user,
          totalInflow: inflows,
          totalSales: sales,
          totalOutflow: outflows,
          expectedClosingBalance,
          variance
        };
      })
    );

    res.json({ records: formattedRecords });
  } catch (error) {
    next(error);
  }
};

const adminVerify = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['APPROVED', 'FLAGGED', 'UNVERIFIED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const record = await prisma.balanceRecord.findUnique({
      where: { id }
    });

    if (!record) {
      return res.status(444).json({ error: 'Balance record not found.' });
    }

    const updated = await prisma.balanceRecord.update({
      where: { id },
      data: {
        status,
        remarks: remarks || null
      },
      include: {
        user: { select: { username: true } }
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_STATUS',
        tableName: 'BalanceRecord',
        recordId: id,
        details: {
          oldStatus: record.status,
          newStatus: status,
          remarks: remarks || ''
        },
        userId: req.user.id
      }
    });

    res.json({
      message: `Record successfully marked as ${status}.`,
      record: {
        ...updated,
        openingBalance: parseFloat(updated.openingBalance),
        closingBalance: updated.closingBalance !== null ? parseFloat(updated.closingBalance) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

const adminUpdate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { openingBalance, closingBalance, remarks } = req.body;

    const record = await prisma.balanceRecord.findUnique({
      where: { id }
    });

    if (!record) {
      return res.status(444).json({ error: 'Balance record not found.' });
    }

    const updateData = {};
    if (openingBalance !== undefined) updateData.openingBalance = parseFloat(openingBalance);
    if (closingBalance !== undefined) updateData.closingBalance = closingBalance !== null ? parseFloat(closingBalance) : null;
    if (remarks !== undefined) updateData.remarks = remarks || null;

    const updated = await prisma.balanceRecord.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { username: true } }
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_BALANCES',
        tableName: 'BalanceRecord',
        recordId: id,
        details: {
          previous: {
            openingBalance: parseFloat(record.openingBalance),
            closingBalance: record.closingBalance !== null ? parseFloat(record.closingBalance) : null,
            remarks: record.remarks
          },
          updated: {
            openingBalance: parseFloat(updated.openingBalance),
            closingBalance: updated.closingBalance !== null ? parseFloat(updated.closingBalance) : null,
            remarks: updated.remarks
          }
        },
        userId: req.user.id
      }
    });

    res.json({
      message: 'Record updated successfully by Admin.',
      record: {
        ...updated,
        openingBalance: parseFloat(updated.openingBalance),
        closingBalance: updated.closingBalance !== null ? parseFloat(updated.closingBalance) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        tableName: 'BalanceRecord'
      },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodayBalance,
  createOpening,
  createClosing,
  adminGetAll,
  adminVerify,
  adminUpdate,
  getAuditLogs
};
