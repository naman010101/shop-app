const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');

const prisma = new PrismaClient();

const getSummary = async (req, res, next) => {
  try {
    const { getISTDateTime } = require('../utils/timezone');
    const today = getISTDateTime().date;
    const isOwner = req.user.role === 'OWNER';

    const baseFilter = isOwner
      ? { date: today }
      : { date: today, userId: req.user.id };

    let balanceRecord = null;
    if (!isOwner) {
      balanceRecord = await prisma.balanceRecord.findUnique({
        where: { userId_date: { userId: req.user.id, date: today } }
      });
    }

    const [inflowAgg, salesAgg, outflowAgg] = await Promise.all([
      prisma.cashInflow.aggregate({ where: baseFilter, _sum: { amount: true }, _count: true }),
      prisma.sale.aggregate({ where: baseFilter, _sum: { amount: true }, _count: true }),
      prisma.cashOutflow.aggregate({ where: baseFilter, _sum: { amount: true }, _count: true }),
    ]);

    const totalInflow  = parseFloat(inflowAgg._sum.amount  || 0);
    const totalSales   = parseFloat(salesAgg._sum.amount   || 0);
    const totalOutflow = parseFloat(outflowAgg._sum.amount || 0);

    // ── STAFF response ────────────────────────────────────────────────────────
    if (!isOwner) {
      const [recentInflows, recentSales, recentOutflows] = await Promise.all([
        prisma.cashInflow.findMany({ where: baseFilter, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.sale.findMany({ where: baseFilter, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.cashOutflow.findMany({ where: baseFilter, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);

      const openingBalance = balanceRecord ? parseFloat(balanceRecord.openingBalance) : 0;
      const expectedClosingBalance = balanceRecord ? openingBalance + totalInflow + totalSales - totalOutflow : null;

      return res.json({
        role: 'STAFF',
        today,
        totalInflow,
        totalSales,
        totalOutflow,
        inflowCount:  inflowAgg._count,
        salesCount:   salesAgg._count,
        outflowCount: outflowAgg._count,
        expectedClosingBalance,
        balanceRecord: balanceRecord ? {
          ...balanceRecord,
          openingBalance: parseFloat(balanceRecord.openingBalance),
          closingBalance: balanceRecord.closingBalance !== null ? parseFloat(balanceRecord.closingBalance) : null
        } : null,
        recentInflows:  recentInflows.map(r  => ({ ...r, amount: parseFloat(r.amount) })),
        recentSales:    recentSales.map(r    => ({ ...r, amount: parseFloat(r.amount) })),
        recentOutflows: recentOutflows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      });
    }

    // ── OWNER response ───────────────────────────────────────────────────────
    const [recentInflows, recentSales, recentOutflows, todayBalanceRecords] = await Promise.all([
      prisma.cashInflow.findMany({ where: { date: today }, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.sale.findMany({ where: { date: today }, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.cashOutflow.findMany({ where: { date: today }, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.balanceRecord.findMany({ where: { date: today } }),
    ]);

    // Sum opening balances across all staff for today
    const openingBalanceTotal = todayBalanceRecords.reduce((s, r) => s + parseFloat(r.openingBalance), 0);
    // Compute expected and actual closing for today
    const systemExpectedClosing = openingBalanceTotal + totalInflow + totalSales - totalOutflow;
    const staffClosingBalance = todayBalanceRecords
      .filter(r => r.closingBalance !== null)
      .reduce((s, r) => s + parseFloat(r.closingBalance), 0);
    const hasClosingSubmitted = todayBalanceRecords.some(r => r.closingBalance !== null);
    const cashDifference = hasClosingSubmitted ? staffClosingBalance - systemExpectedClosing : null;

    // Net Cash includes opening balance
    const netBalance = openingBalanceTotal + totalInflow + totalSales - totalOutflow;

    // ── Last working day calculation ──────────────────────────────────────────
    let lastWorkingDayNetCash = null;
    let lastWorkingDate = null;

    const lastDayRecord = await prisma.balanceRecord.findFirst({
      where: { date: { lt: today } },
      orderBy: { date: 'desc' },
    });

    if (lastDayRecord) {
      lastWorkingDate = lastDayRecord.date;
      // Get all balance records for that day
      const lastDayBalanceRecords = await prisma.balanceRecord.findMany({
        where: { date: lastWorkingDate },
      });
      const lastDayOpening = lastDayBalanceRecords.reduce((s, r) => s + parseFloat(r.openingBalance), 0);

      const [lastInflowAgg, lastSalesAgg, lastOutflowAgg] = await Promise.all([
        prisma.cashInflow.aggregate({ where: { date: lastWorkingDate }, _sum: { amount: true } }),
        prisma.sale.aggregate({ where: { date: lastWorkingDate }, _sum: { amount: true } }),
        prisma.cashOutflow.aggregate({ where: { date: lastWorkingDate }, _sum: { amount: true } }),
      ]);

      lastWorkingDayNetCash = lastDayOpening
        + parseFloat(lastInflowAgg._sum.amount || 0)
        + parseFloat(lastSalesAgg._sum.amount  || 0)
        - parseFloat(lastOutflowAgg._sum.amount || 0);
    }

    const recentTransactions = [
      ...recentInflows.map(r  => ({ ...r, type: 'inflow',  amount: parseFloat(r.amount) })),
      ...recentSales.map(r    => ({ ...r, type: 'sales',   amount: parseFloat(r.amount) })),
      ...recentOutflows.map(r => ({ ...r, type: 'outflow', amount: parseFloat(r.amount) })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    return res.json({
      role: 'OWNER',
      today,
      totalInflow,
      totalSales,
      totalOutflow,
      openingBalanceTotal,
      netBalance,
      systemExpectedClosing,
      staffClosingBalance: hasClosingSubmitted ? staffClosingBalance : null,
      cashDifference,
      lastWorkingDayNetCash,
      lastWorkingDate,
      inflowCount:          inflowAgg._count,
      salesCount:           salesAgg._count,
      outflowCount:         outflowAgg._count,
      outflowExceedsInflow: totalOutflow > (totalInflow + totalSales),
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
