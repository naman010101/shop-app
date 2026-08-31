'use client';

import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AlertBannerProps {
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
}

export default function AlertBanner({ totalInflow, totalSales, totalOutflow }: AlertBannerProps) {
  const totalInflowAndSales = totalInflow + totalSales;
  const isExceeded = totalOutflow > totalInflowAndSales;

  if (!isExceeded) return null;

  return (
    <div className="flex items-center gap-3 p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-2xl animate-pulse">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
      <div className="text-sm">
        <span className="font-semibold">Financial Alert:</span> Today's total cash outflow of{' '}
        <span className="font-bold font-mono">{formatCurrency(totalOutflow)}</span> exceeds the total cash inflow + sales of{' '}
        <span className="font-bold font-mono">{formatCurrency(totalInflowAndSales)}</span>. Please review the cash register.
      </div>
    </div>
  );
}
