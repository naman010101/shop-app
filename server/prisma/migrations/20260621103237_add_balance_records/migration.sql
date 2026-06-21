-- CreateTable
CREATE TABLE "BalanceRecord" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingTime" TEXT NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingTime" TEXT,
    "closingBalance" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BalanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BalanceRecord_userId_date_key" ON "BalanceRecord"("userId", "date");

-- AddForeignKey
ALTER TABLE "BalanceRecord" ADD CONSTRAINT "BalanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
