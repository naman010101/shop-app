const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');

const prisma = new PrismaClient();

/**
 * GET /api/dashboard/summary
 *
 * OWNER  → Full financial overview (all 4 KPIs + combined recent transactions)
 * STAFF  → Restricted view (3 KPIs only + separated recent lists, own entries only)
 *          netBalance and outflowExceedsInflow are intentionally omitted for staff.
 */
const getSummary = async (req, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const isOwner = req.user.role === 'OWNER';

    // Owners see all data; staff only see their own entries
    const baseFilter = isOwner ? { date: today } : { date: today, userId: req.user.id };

    // ── Aggregates (both roles need these three) ──────────────────────────────
    const [inflowAgg, salesAgg, outflowAgg] = await Promise.all([
      prisma.cashInflow.aggregate({
        where: baseFilter,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: baseFilter,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashOutflow.aggregate({
        where: baseFilter,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalInflow  = parseFloat(inflowAgg._sum.amount  || 0);
    const totalSales   = parseFloat(salesAgg._sum.amount   || 0);
    const totalOutflow = parseFloat(outflowAgg._sum.amount || 0);

    // ── STAFF response — separated recent lists, no financial roll-up ─────────
    if (!isOwner) {
      const [recentInflows, recentSales, recentOutflows] = await Promise.all([
        prisma.cashInflow.findMany({
          where: baseFilter,
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.sale.findMany({
          where: baseFilter,
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.cashOutflow.findMany({
          where: baseFilter,
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      return res.json({
        role: 'STAFF',
        today,
        totalInflow,
        totalSales,
        totalOutflow,
        inflowCount:  inflowAgg._count,
        salesCount:   salesAgg._count,
        outflowCount: outflowAgg._count,
        // Separated tables for staff — no mixed/net data
        recentInflows:  recentInflows.map(r  => ({ ...r, amount: parseFloat(r.amount) })),
        recentSales:    recentSales.map(r    => ({ ...r, amount: parseFloat(r.amount) })),
        recentOutflows: recentOutflows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      });
    }

    // ── OWNER response — full financial picture ───────────────────────────────
    const [recentInflows, recentSales, recentOutflows] = await Promise.all([
      prisma.cashInflow.findMany({
        where: { date: today },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.sale.findMany({
        where: { date: today },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.cashOutflow.findMany({
        where: { date: today },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const netBalance = totalInflow + totalSales - totalOutflow;

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
      netBalance,
      inflowCount:         inflowAgg._count,
      salesCount:          salesAgg._count,
      outflowCount:        outflowAgg._count,
      outflowExceedsInflow: totalOutflow > (totalInflow + totalSales),
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
