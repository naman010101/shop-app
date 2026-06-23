const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// ── PARTY DISPATCH REGISTER ──────────────────────────────────────────────────

const getAllPartyDispatches = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, partyName, itemName, billNumber, challanNumber, slipNumber, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (userId) where.userId = userId;
    if (partyName) where.party_name = { contains: partyName, mode: 'insensitive' };
    if (itemName) where.item_name = { contains: itemName, mode: 'insensitive' };
    if (billNumber) where.bill_number = { contains: billNumber, mode: 'insensitive' };
    if (challanNumber) where.challan_number = { contains: challanNumber, mode: 'insensitive' };
    if (slipNumber) where.slip_number = { contains: slipNumber, mode: 'insensitive' };
    if (startDate || endDate) {
      // Date filtering on created_at (timestamp)
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.created_at.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [records, total] = await Promise.all([
      prisma.warehousePartyDispatch.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.warehousePartyDispatch.count({ where }),
    ]);

    res.json({ records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    next(error);
  }
};

const createPartyDispatch = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bill_number, challan_number, party_name, item_name, quantity, slip_number, by_person } = req.body;

    // Check duplicate slip number
    const existing = await prisma.warehousePartyDispatch.findFirst({
      where: { slip_number }
    });
    if (existing) {
      return res.status(409).json({ error: `Slip number '${slip_number}' already exists in Party Dispatch register.` });
    }

    const record = await prisma.warehousePartyDispatch.create({
      data: {
        bill_number,
        challan_number,
        party_name,
        item_name,
        quantity: parseInt(quantity),
        slip_number,
        by_person,
        userId: req.user.id,
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'WarehousePartyDispatch',
        recordId: record.id,
        details: { bill_number, challan_number, party_name, item_name, quantity, slip_number, by_person },
        userId: req.user.id,
      },
    });

    res.status(201).json({ message: 'Party dispatch recorded successfully.', record });
  } catch (error) {
    next(error);
  }
};

const updatePartyDispatch = async (req, res, next) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the Owner can edit warehouse records.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { bill_number, challan_number, party_name, item_name, quantity, slip_number, by_person } = req.body;

    if (slip_number) {
      const existing = await prisma.warehousePartyDispatch.findFirst({
        where: { slip_number, id: { not: id } }
      });
      if (existing) {
        return res.status(409).json({ error: `Slip number '${slip_number}' already exists.` });
      }
    }

    const record = await prisma.warehousePartyDispatch.update({
      where: { id },
      data: {
        ...(bill_number && { bill_number }),
        ...(challan_number && { challan_number }),
        ...(party_name && { party_name }),
        ...(item_name && { item_name }),
        ...(quantity && { quantity: parseInt(quantity) }),
        ...(slip_number && { slip_number }),
        ...(by_person && { by_person }),
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'WarehousePartyDispatch',
        recordId: id,
        details: req.body,
        userId: req.user.id,
      },
    });

    res.json({ message: 'Party dispatch record updated successfully.', record });
  } catch (error) {
    next(error);
  }
};

const deletePartyDispatch = async (req, res, next) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the Owner can delete warehouse records.' });
    }

    const { id } = req.params;
    await prisma.warehousePartyDispatch.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'WarehousePartyDispatch',
        recordId: id,
        details: {},
        userId: req.user.id,
      },
    });

    res.json({ message: 'Party dispatch record deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── SHOP STOCK TRANSFER REGISTER ──────────────────────────────────────────────

const getAllShopTransfers = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, itemName, slipNumber, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (userId) where.userId = userId;
    if (itemName) where.item_name = { contains: itemName, mode: 'insensitive' };
    if (slipNumber) where.slip_number = { contains: slipNumber, mode: 'insensitive' };
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.created_at.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [records, total] = await Promise.all([
      prisma.warehouseShopTransfer.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.warehouseShopTransfer.count({ where }),
    ]);

    res.json({ records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    next(error);
  }
};

const createShopTransfer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { item_name, quantity, slip_number, by_person } = req.body;

    // Check duplicate slip number
    const existing = await prisma.warehouseShopTransfer.findFirst({
      where: { slip_number }
    });
    if (existing) {
      return res.status(409).json({ error: `Slip number '${slip_number}' already exists in Shop Transfer register.` });
    }

    const record = await prisma.warehouseShopTransfer.create({
      data: {
        item_name,
        quantity: parseInt(quantity),
        slip_number,
        by_person,
        userId: req.user.id,
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'WarehouseShopTransfer',
        recordId: record.id,
        details: { item_name, quantity, slip_number, by_person },
        userId: req.user.id,
      },
    });

    res.status(201).json({ message: 'Shop stock transfer recorded successfully.', record });
  } catch (error) {
    next(error);
  }
};

const updateShopTransfer = async (req, res, next) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the Owner can edit warehouse records.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { item_name, quantity, slip_number, by_person } = req.body;

    if (slip_number) {
      const existing = await prisma.warehouseShopTransfer.findFirst({
        where: { slip_number, id: { not: id } }
      });
      if (existing) {
        return res.status(409).json({ error: `Slip number '${slip_number}' already exists.` });
      }
    }

    const record = await prisma.warehouseShopTransfer.update({
      where: { id },
      data: {
        ...(item_name && { item_name }),
        ...(quantity && { quantity: parseInt(quantity) }),
        ...(slip_number && { slip_number }),
        ...(by_person && { by_person }),
      },
      include: { user: { select: { username: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'WarehouseShopTransfer',
        recordId: id,
        details: req.body,
        userId: req.user.id,
      },
    });

    res.json({ message: 'Shop stock transfer record updated successfully.', record });
  } catch (error) {
    next(error);
  }
};

const deleteShopTransfer = async (req, res, next) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the Owner can delete warehouse records.' });
    }

    const { id } = req.params;
    await prisma.warehouseShopTransfer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'WarehouseShopTransfer',
        recordId: id,
        details: {},
        userId: req.user.id,
      },
    });

    res.json({ message: 'Shop stock transfer record deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPartyDispatches,
  createPartyDispatch,
  updatePartyDispatch,
  deletePartyDispatch,
  getAllShopTransfers,
  createShopTransfer,
  updateShopTransfer,
  deleteShopTransfer,
};
