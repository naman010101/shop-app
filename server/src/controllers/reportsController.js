const { PrismaClient } = require('@prisma/client');
const { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } = require('date-fns');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const getDateRange = (type, date) => {
  let d;
  if (date) {
    d = parseISO(date);
  } else {
    const { getISTDateTime } = require('../utils/timezone');
    d = parseISO(getISTDateTime().date);
  }
  if (type === 'daily') return { start: format(d, 'yyyy-MM-dd'), end: format(d, 'yyyy-MM-dd') };
  if (type === 'weekly') return { start: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
  if (type === 'monthly') return { start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') };
  return { start: format(d, 'yyyy-MM-dd'), end: format(d, 'yyyy-MM-dd') };
};

const getReport = async (req, res, next) => {
  try {
    const { type = 'daily', date, startDate, endDate, userId } = req.query;
    let range;
    if (startDate && endDate) {
      range = { start: startDate, end: endDate };
    } else {
      range = getDateRange(type, date);
    }

    const userFilter = userId ? { userId } : {};
    const dateFilter = { date: { gte: range.start, lte: range.end } };

    const [inflows, sales, outflows] = await Promise.all([
      prisma.cashInflow.findMany({
        where: { ...dateFilter, ...userFilter },
        include: { user: { select: { username: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.sale.findMany({
        where: { ...dateFilter, ...userFilter },
        include: { user: { select: { username: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.cashOutflow.findMany({
        where: { ...dateFilter, ...userFilter },
        include: { user: { select: { username: true } } },
        orderBy: { date: 'asc' },
      }),
    ]);

    const totalInflow = inflows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalSales = sales.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalOutflow = outflows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const netBalance = totalInflow + totalSales - totalOutflow;

    res.json({
      range,
      type,
      summary: { totalInflow, totalSales, totalOutflow, netBalance },
      inflows: inflows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      sales: sales.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      outflows: outflows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    });
  } catch (error) {
    next(error);
  }
};

const getUserWiseReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, username: true, role: true,
        inflows: { where: startDate || endDate ? { date: dateFilter } : {}, select: { amount: true } },
        sales: { where: startDate || endDate ? { date: dateFilter } : {}, select: { amount: true } },
        outflows: { where: startDate || endDate ? { date: dateFilter } : {}, select: { amount: true } },
      },
    });

    const report = users.map(u => ({
      userId: u.id,
      username: u.username,
      role: u.role,
      totalInflow: u.inflows.reduce((s, r) => s + parseFloat(r.amount), 0),
      totalSales: u.sales.reduce((s, r) => s + parseFloat(r.amount), 0),
      totalOutflow: u.outflows.reduce((s, r) => s + parseFloat(r.amount), 0),
      netBalance: u.inflows.reduce((s, r) => s + parseFloat(r.amount), 0) +
                  u.sales.reduce((s, r) => s + parseFloat(r.amount), 0) -
                  u.outflows.reduce((s, r) => s + parseFloat(r.amount), 0),
    }));

    res.json({ report });
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const { type = 'daily', date, startDate, endDate, userId } = req.query;
    let range;
    if (startDate && endDate) {
      range = { start: startDate, end: endDate };
    } else {
      range = getDateRange(type, date);
    }

    const userFilter = userId ? { userId } : {};
    const dateFilter = { date: { gte: range.start, lte: range.end } };

    const [inflows, sales, outflows] = await Promise.all([
      prisma.cashInflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.sale.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.cashOutflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
    ]);

    const wb = XLSX.utils.book_new();

    const inflowSheet = XLSX.utils.json_to_sheet(inflows.map(r => ({
      'Transaction ID': r.id, 'Date': r.date, 'Time': r.time, 'Slip Number': r.slipNumber,
      'Customer Name': r.customerName, 'Amount (INR)': parseFloat(r.amount), 'Remarks': r.remarks || '', 'Staff': r.user.username,
    })));
    XLSX.utils.book_append_sheet(wb, inflowSheet, 'Cash Inflow');

    const salesSheet = XLSX.utils.json_to_sheet(sales.map(r => ({
      'Sales ID': r.id, 'Date': r.date, 'Time': r.time, 'Product/Service': r.productName,
      'Customer Name': r.customerName, 'Amount (INR)': parseFloat(r.amount), 'Notes': r.notes || '', 'Staff': r.user.username,
    })));
    XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales');

    const outflowSheet = XLSX.utils.json_to_sheet(outflows.map(r => ({
      'Outflow ID': r.id, 'Date': r.date, 'Time': r.time, 'Reason': r.reason,
      'Amount (INR)': parseFloat(r.amount), 'Notes': r.notes || '', 'Staff': r.user.username,
    })));
    XLSX.utils.book_append_sheet(wb, outflowSheet, 'Cash Outflow');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `cash_report_${range.start}_to_${range.end}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    next(error);
  }
};

module.exports = { getReport, getUserWiseReport, exportExcel };
