const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const cashierHash = await bcrypt.hash('Cashier@1234', 12);
  const warehouseHash = await bcrypt.hash('Warehouse@1234', 12);

  // 1. Seed Owner (Admin)
  const owner = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  // 2. Seed Cashier 1
  const cashier1 = await prisma.user.upsert({
    where: { username: 'cashier1' },
    update: {},
    create: {
      username: 'cashier1',
      passwordHash: cashierHash,
      role: 'CASHIER',
      isActive: true,
    },
  });

  // 3. Seed Cashier 2
  const cashier2 = await prisma.user.upsert({
    where: { username: 'cashier2' },
    update: {},
    create: {
      username: 'cashier2',
      passwordHash: cashierHash,
      role: 'CASHIER',
      isActive: true,
    },
  });

  // 4. Seed Warehouse Manager 1
  const warehouse1 = await prisma.user.upsert({
    where: { username: 'warehouse1' },
    update: {},
    create: {
      username: 'warehouse1',
      passwordHash: warehouseHash,
      role: 'WAREHOUSE_MGMT',
      isActive: true,
    },
  });

  console.log('✅ Base accounts seeded successfully:');
  console.log('   👑 Owner:      admin      / Admin@1234');
  console.log('   👤 Cashier1:   cashier1   / Cashier@1234');
  console.log('   👤 Cashier2:   cashier2   / Cashier@1234');
  console.log('   📦 Warehouse1: warehouse1 / Warehouse@1234');

  // 5. Seed Mock Transactions for Today (if table is empty)
  const today = new Date().toISOString().slice(0, 10);
  
  const inflowCount = await prisma.cashInflow.count();
  if (inflowCount === 0) {
    console.log('🌱 Seeding sample cash inflows...');
    await prisma.cashInflow.createMany({
      data: [
        {
          amount: 5500.00,
          slipNumber: 'SLIP-10001',
          customerName: 'Rahul Sharma',
          remarks: 'Standard customer deposit',
          date: today,
          time: '10:15:00',
          userId: cashier1.id,
        },
        {
          amount: 8200.00,
          slipNumber: 'SLIP-10002',
          customerName: 'Priya Patel',
          remarks: 'Advance order payment',
          date: today,
          time: '11:45:00',
          userId: cashier2.id,
        },
        {
          amount: 1250.00,
          slipNumber: 'SLIP-10003',
          customerName: 'Karan Singh',
          remarks: 'Cash counter tally deposit',
          date: today,
          time: '15:20:00',
          userId: cashier1.id,
        }
      ]
    });
  }

  const saleCount = await prisma.sale.count();
  if (saleCount === 0) {
    console.log('🌱 Seeding sample sales...');
    await prisma.sale.createMany({
      data: [
        {
          productName: 'Computer Accessories Bundle',
          amount: 14500.00,
          customerName: 'Amit Verma',
          notes: 'Invoice #INV-2026-001',
          date: today,
          time: '09:30:00',
          userId: cashier1.id,
        },
        {
          productName: 'Office Repair Service',
          amount: 4800.00,
          customerName: 'Sunita Rao',
          notes: 'Cash payment received',
          date: today,
          time: '14:10:00',
          userId: cashier2.id,
        }
      ]
    });
  }

  const outflowCount = await prisma.cashOutflow.count();
  if (outflowCount === 0) {
    console.log('🌱 Seeding sample cash outflows...');
    await prisma.cashOutflow.createMany({
      data: [
        {
          amount: 1200.00,
          reason: 'Office Tea & Snacks',
          notes: 'Local bakery cash receipt',
          date: today,
          time: '12:00:00',
          userId: cashier1.id,
        },
        {
          amount: 2500.00,
          reason: 'Stationery & Printing Paper',
          notes: 'Standard stationery mart',
          date: today,
          time: '16:00:00',
          userId: cashier2.id,
        }
      ]
    });
  }

  console.log('✅ Seed process completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

