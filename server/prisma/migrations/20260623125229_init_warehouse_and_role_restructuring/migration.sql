-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'CASHIER';
ALTER TYPE "Role" ADD VALUE 'WAREHOUSE_MGMT';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CASHIER';

-- CreateTable
CREATE TABLE "warehouse_party_dispatch" (
    "id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "challan_number" TEXT NOT NULL,
    "party_name" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "slip_number" TEXT NOT NULL,
    "by_person" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "warehouse_party_dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_shop_transfer" (
    "id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "slip_number" TEXT NOT NULL,
    "by_person" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "warehouse_shop_transfer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "warehouse_party_dispatch" ADD CONSTRAINT "warehouse_party_dispatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_shop_transfer" ADD CONSTRAINT "warehouse_shop_transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
