const { PrismaClient } = require('@prisma/client');
const { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } = require('date-fns');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

const getDateRange = (type, date) => {
  let d;
  if (date) {
    d = parseISO(date);
  } else {
    const { getISTDateTime } = require('../utils/timezone');
    d = parseISO(getISTDateTime().date);
  }
  if (type === 'daily')   return { start: format(d, 'yyyy-MM-dd'), end: format(d, 'yyyy-MM-dd') };
  if (type === 'weekly')  return { start: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
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
      const { getISTDateTime } = require('../utils/timezone');
      const today = getISTDateTime().date;
      range = getDateRange(type, date || today);
    }

    const userFilter = userId ? { userId } : {};
    const dateFilter = { date: { gte: range.start, lte: range.end } };
    const balanceFilter = userId ? { userId, date: { gte: range.start, lte: range.end } } : { date: { gte: range.start, lte: range.end } };

    const [inflows, sales, outflows, balanceRecords] = await Promise.all([
      prisma.cashInflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.sale.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.cashOutflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.balanceRecord.findMany({ where: balanceFilter, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
    ]);

    const totalInflow  = inflows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalSales   = sales.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalOutflow = outflows.reduce((s, r) => s + parseFloat(r.amount), 0);

    // Opening balance = sum of all opening balances for the period
    const openingBalance = balanceRecords.reduce((s, r) => s + parseFloat(r.openingBalance), 0);
    // Closing balance = sum of all submitted closing balances for the period
    const closingBalance = balanceRecords
      .filter(r => r.closingBalance !== null)
      .reduce((s, r) => s + parseFloat(r.closingBalance), 0);
    // Net Cash Movement includes opening balance
    const netCashMovement = openingBalance + totalInflow + totalSales - totalOutflow;
    // Legacy netBalance kept for compatibility
    const netBalance = netCashMovement;

    res.json({
      range,
      type,
      summary: {
        totalInflow,
        totalSales,
        totalOutflow,
        openingBalance,
        closingBalance,
        netCashMovement,
        netBalance,
      },
      inflows:  inflows.map(r  => ({ ...r, amount: parseFloat(r.amount) })),
      sales:    sales.map(r    => ({ ...r, amount: parseFloat(r.amount) })),
      outflows: outflows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      balanceRecords: balanceRecords.map(r => ({
        ...r,
        openingBalance: parseFloat(r.openingBalance),
        closingBalance: r.closingBalance !== null ? parseFloat(r.closingBalance) : null,
      })),
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
    const hasDateFilter = startDate || endDate;

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, username: true, role: true,
        inflows:  { where: hasDateFilter ? { date: dateFilter } : {}, select: { amount: true } },
        sales:    { where: hasDateFilter ? { date: dateFilter } : {}, select: { amount: true } },
        outflows: { where: hasDateFilter ? { date: dateFilter } : {}, select: { amount: true } },
        balanceRecords: { where: hasDateFilter ? { date: dateFilter } : {}, select: { openingBalance: true, closingBalance: true } },
      },
    });

    const report = users.map(u => {
      const totalInflow  = u.inflows.reduce((s, r)  => s + parseFloat(r.amount), 0);
      const totalSales   = u.sales.reduce((s, r)    => s + parseFloat(r.amount), 0);
      const totalOutflow = u.outflows.reduce((s, r) => s + parseFloat(r.amount), 0);
      const openingBalance = u.balanceRecords.reduce((s, r) => s + parseFloat(r.openingBalance), 0);
      const netBalance = openingBalance + totalInflow + totalSales - totalOutflow;
      return { userId: u.id, username: u.username, role: u.role, totalInflow, totalSales, totalOutflow, openingBalance, netBalance };
    });

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
      const { getISTDateTime } = require('../utils/timezone');
      const today = getISTDateTime().date;
      range = getDateRange(type, date || today);
    }

    const userFilter = userId ? { userId } : {};
    const dateFilter = { date: { gte: range.start, lte: range.end } };
    const balanceFilter = userId ? { userId, date: { gte: range.start, lte: range.end } } : { date: { gte: range.start, lte: range.end } };

    const [inflows, sales, outflows, balanceRecords] = await Promise.all([
      prisma.cashInflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.sale.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.cashOutflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.balanceRecord.findMany({ where: balanceFilter, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
    ]);

    const totalInflow  = inflows.reduce((s, r)  => s + parseFloat(r.amount), 0);
    const totalSales   = sales.reduce((s, r)    => s + parseFloat(r.amount), 0);
    const totalOutflow = outflows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const openingBalance = balanceRecords.reduce((s, r) => s + parseFloat(r.openingBalance), 0);
    const closingBalance = balanceRecords.filter(r => r.closingBalance !== null).reduce((s, r) => s + parseFloat(r.closingBalance), 0);
    const netCashMovement = openingBalance + totalInflow + totalSales - totalOutflow;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      { Metric: 'Report Period', Value: `${range.start} to ${range.end}` },
      { Metric: 'Report Type', Value: type.toUpperCase() },
      { Metric: '', Value: '' },
      { Metric: 'Opening Balance (INR)', Value: openingBalance },
      { Metric: 'Total Cash Inflow (INR)', Value: totalInflow },
      { Metric: 'Total Sales (INR)', Value: totalSales },
      { Metric: 'Total Cash Outflow (INR)', Value: totalOutflow },
      { Metric: 'Net Cash Movement (INR)', Value: netCashMovement },
      { Metric: 'Staff Closing Balance (INR)', Value: closingBalance },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Cash Inflow Sheet
    const inflowSheet = XLSX.utils.json_to_sheet(inflows.map(r => ({
      'Date': r.date, 'Time': r.time, 'Slip Number': r.slipNumber,
      'Customer Name': r.customerName, 'Amount (INR)': parseFloat(r.amount),
      'Remarks': r.remarks || '', 'Staff': r.user.username,
    })));
    XLSX.utils.book_append_sheet(wb, inflowSheet, 'Cash Inflow');

    // Sales Sheet
    const salesSheet = XLSX.utils.json_to_sheet(sales.map(r => ({
      'Date': r.date, 'Time': r.time, 'Person Name': r.productName,
      'Customer Name': r.customerName, 'Amount (INR)': parseFloat(r.amount),
      'Notes': r.notes || '', 'Staff': r.user.username,
    })));
    XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales');

    // Cash Outflow Sheet
    const outflowSheet = XLSX.utils.json_to_sheet(outflows.map(r => ({
      'Date': r.date, 'Time': r.time, 'Reason': r.reason,
      'Amount (INR)': parseFloat(r.amount), 'Notes': r.notes || '', 'Staff': r.user.username,
    })));
    XLSX.utils.book_append_sheet(wb, outflowSheet, 'Cash Outflow');

    // Balance Records Sheet
    const balanceSheet = XLSX.utils.json_to_sheet(balanceRecords.map(r => ({
      'Date': r.date, 'Staff': r.user.username,
      'Opening Balance (INR)': parseFloat(r.openingBalance),
      'Opening Time': r.openingTime,
      'Closing Balance (INR)': r.closingBalance !== null ? parseFloat(r.closingBalance) : 'Not Submitted',
      'Closing Time': r.closingTime || 'N/A',
      'Status': r.status,
    })));
    XLSX.utils.book_append_sheet(wb, balanceSheet, 'Balance Records');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `cash_report_${range.start}_to_${range.end}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    next(error);
  }
};

const exportPDF = async (req, res, next) => {
  try {
    const { type = 'daily', date, startDate, endDate, userId } = req.query;
    let range;
    if (startDate && endDate) {
      range = { start: startDate, end: endDate };
    } else {
      const { getISTDateTime } = require('../utils/timezone');
      const today = getISTDateTime().date;
      range = getDateRange(type, date || today);
    }

    const userFilter = userId ? { userId } : {};
    const dateFilter = { date: { gte: range.start, lte: range.end } };
    const balanceFilter = userId ? { userId, date: { gte: range.start, lte: range.end } } : { date: { gte: range.start, lte: range.end } };

    const [inflows, sales, outflows, balanceRecords] = await Promise.all([
      prisma.cashInflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.sale.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.cashOutflow.findMany({ where: { ...dateFilter, ...userFilter }, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
      prisma.balanceRecord.findMany({ where: balanceFilter, include: { user: { select: { username: true } } }, orderBy: { date: 'asc' } }),
    ]);

    const totalInflow  = inflows.reduce((s, r)  => s + parseFloat(r.amount), 0);
    const totalSales   = sales.reduce((s, r)    => s + parseFloat(r.amount), 0);
    const totalOutflow = outflows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const openingBalance = balanceRecords.reduce((s, r) => s + parseFloat(r.openingBalance), 0);
    const closingBalance = balanceRecords.filter(r => r.closingBalance !== null).reduce((s, r) => s + parseFloat(r.closingBalance), 0);
    const netCashMovement = openingBalance + totalInflow + totalSales - totalOutflow;

    const fmt = (n) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `cash_report_${range.start}_to_${range.end}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Handle PDF stream errors — if the doc errors after pipe starts,
    // we can't send a JSON error because headers are already sent.
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation failed' });
      } else {
        res.end();
      }
    });

    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('Cash Flow Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Period: ${range.start} to ${range.end} | Type: ${type.toUpperCase()}`, { align: 'center' });
    doc.moveDown(1);

    // Summary Box
    doc.fontSize(12).font('Helvetica-Bold').text('Summary');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);
    const summaryRows = [
      ['Opening Balance', fmt(openingBalance)],
      ['Total Cash Inflow', fmt(totalInflow)],
      ['Total Sales', fmt(totalSales)],
      ['Total Cash Outflow', fmt(totalOutflow)],
      ['Net Cash Movement', fmt(netCashMovement)],
      ['Staff Closing Balance', fmt(closingBalance)],
    ];
    summaryRows.forEach(([label, value]) => {
      doc.font('Helvetica').fontSize(10).text(label, 40, doc.y, { continued: true, width: 300 });
      doc.font('Helvetica-Bold').text(value, { align: 'right' });
    });
    doc.moveDown(1);

    const drawTable = (title, headers, rows) => {
      if (rows.length === 0) return;
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').text(title);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);
      // Header row
      const colW = Math.floor(515 / headers.length);
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(8).text(h, 40 + i * colW, doc.y, { width: colW, continued: i < headers.length - 1 });
      });
      doc.moveDown(0.3);
      // Data rows
      rows.forEach(row => {
        if (doc.y > 740) doc.addPage();
        row.forEach((cell, i) => {
          doc.font('Helvetica').fontSize(8).text(String(cell), 40 + i * colW, doc.y, { width: colW, continued: i < row.length - 1 });
        });
        doc.moveDown(0.2);
      });
    };

    drawTable(
      'Cash Inflow Transactions',
      ['Date', 'Time', 'Slip#', 'Customer', 'Amount', 'Staff'],
      inflows.map(r => [r.date, r.time, r.slipNumber || '', r.customerName || '', fmt(parseFloat(r.amount)), r.user.username])
    );
    drawTable(
      'Sales Transactions',
      ['Date', 'Time', 'Person', 'Customer', 'Amount', 'Staff'],
      sales.map(r => [r.date, r.time, r.productName || '', r.customerName || '', fmt(parseFloat(r.amount)), r.user.username])
    );
    drawTable(
      'Cash Outflow Transactions',
      ['Date', 'Time', 'Reason', 'Notes', 'Amount', 'Staff'],
      outflows.map(r => [r.date, r.time, r.reason || '', r.notes || '', fmt(parseFloat(r.amount)), r.user.username])
    );
    drawTable(
      'Balance Records',
      ['Date', 'Staff', 'Opening Bal.', 'Opening Time', 'Closing Bal.', 'Status'],
      balanceRecords.map(r => [
        r.date, r.user.username,
        fmt(parseFloat(r.openingBalance)), r.openingTime,
        r.closingBalance !== null ? fmt(parseFloat(r.closingBalance)) : 'Pending',
        r.status
      ])
    );

    doc.end();
  } catch (error) {
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      next(error);
    } else {
      console.error('PDF export error (headers already sent):', error);
      res.end();
    }
  }
};

module.exports = { getReport, getUserWiseReport, exportExcel, exportPDF };
