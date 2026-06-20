const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');

const prisma = new PrismaClient();

const getSummary = async (req, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const isOwner = req.user.role === 'OWNER';
    const userFilter = isOwner ? {} : { userId: req.user.id };

    const [inflowToday, salesToday, outflowToday, recentInflows, recentSales, recentOutflows] = await Promise.all([
      prisma.cashInflow.aggregate({
        where: { date: today, ...userFilter },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { date: today, ...userFilter },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashOutflow.aggregate({
        where: { date: today, ...userFilter },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashInflow.findMany({
        where: { date: today, ...userFilter },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.sale.findMany({
        where: { date: today, ...userFilter },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.cashOutflow.findMany({
        where: { date: today, ...userFilter },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalInflow = parseFloat(inflowToday._sum.amount || 0);
    const totalSales = parseFloat(salesToday._sum.amount || 0);
    const totalOutflow = parseFloat(outflowToday._sum.amount || 0);
    const netBalance = totalInflow + totalSales - totalOutflow;

    const recentTransactions = [
      ...recentInflows.map(r => ({ ...r, type: 'inflow', amount: parseFloat(r.amount) })),
      ...recentSales.map(r => ({ ...r, type: 'sales', amount: parseFloat(r.amount) })),
      ...recentOutflows.map(r => ({ ...r, type: 'outflow', amount: parseFloat(r.amount) })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json({
      today,
      totalInflow,
      totalSales,
      totalOutflow,
      netBalance,
      inflowCount: inflowToday._count,
      salesCount: salesToday._count,
      outflowCount: outflowToday._count,
      outflowExceedsInflow: totalOutflow > (totalInflow + totalSales),
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
