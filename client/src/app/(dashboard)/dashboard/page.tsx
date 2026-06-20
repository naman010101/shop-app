'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import KPICard from '@/components/KPICard';
import AlertBanner from '@/components/AlertBanner';
import DataTable from '@/components/DataTable';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Transaction {
  id: string;
  type: 'inflow' | 'sales' | 'outflow';
  amount: number;
  date: string;
  time: string;
  customerName?: string;
  productName?: string;
  reason?: string;
  user: {
    username: string;
  };
}

interface SummaryData {
  today: string;
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  netBalance: number;
  inflowCount: number;
  salesCount: number;
  outflowCount: number;
  outflowExceedsInflow: boolean;
  recentTransactions: Transaction[];
}

export default function DashboardPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const response = await api.get('/dashboard/summary');
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const columns = [
    {
      header: 'Time',
      accessor: (row: Transaction) => (
        <span className="flex items-center gap-1.5 font-medium text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          {formatTime(row.time)}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: (row: Transaction) => {
        const types = {
          inflow: { label: 'Inflow', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
          sales: { label: 'Sale', style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
          outflow: { label: 'Outflow', style: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
        };
        const current = types[row.type];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${current.style}`}>
            {current.label}
          </span>
        );
      },
    },
    {
      header: 'Particulars',
      accessor: (row: Transaction) => {
        if (row.type === 'inflow') return `Customer: ${row.customerName || 'N/A'}`;
        if (row.type === 'sales') return `Product: ${row.productName || 'N/A'}`;
        if (row.type === 'outflow') return `Reason: ${row.reason || 'N/A'}`;
        return '';
      },
    },
    {
      header: 'Staff',
      accessor: (row: Transaction) => row.user?.username || 'N/A',
    },
    {
      header: 'Amount',
      accessor: (row: Transaction) => {
        const sign = row.type === 'outflow' ? '-' : '+';
        const color = row.type === 'outflow' ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold';
        return <span className={color}>{sign} {formatCurrency(row.amount)}</span>;
      },
      className: 'text-right font-mono',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse mt-6"></div>
      </div>
    );
  }

  const inflowToday = data?.totalInflow || 0;
  const salesToday = data?.totalSales || 0;
  const outflowToday = data?.totalOutflow || 0;
  const netBalance = data?.netBalance || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time sales and cash register activity for today ({data ? formatDate(data.today) : ''}).
          </p>
        </div>
        <button
          onClick={() => fetchSummary(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Outflow Alert Banner */}
      <AlertBanner
        totalInflow={inflowToday}
        totalSales={salesToday}
        totalOutflow={outflowToday}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Inflow Today"
          value={formatCurrency(inflowToday)}
          icon={<ArrowDownLeft className="w-6 h-6" />}
          description={`${data?.inflowCount || 0} deposits`}
          color="emerald"
        />
        <KPICard
          title="Total Sales Today"
          value={formatCurrency(salesToday)}
          icon={<TrendingUp className="w-6 h-6" />}
          description={`${data?.salesCount || 0} bills`}
          color="indigo"
        />
        <KPICard
          title="Total Outflow Today"
          value={formatCurrency(outflowToday)}
          icon={<ArrowUpRight className="w-6 h-6" />}
          description={`${data?.outflowCount || 0} expenses`}
          color="rose"
        />
        <KPICard
          title="Net Cash Balance"
          value={formatCurrency(netBalance)}
          icon={<Wallet className="w-6 h-6" />}
          description="Inflows + Sales - Outflows"
          color={netBalance >= 0 ? 'amber' : 'rose'}
        />
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Recent Register Transactions
        </h2>
        <DataTable
          columns={columns}
          data={data?.recentTransactions || []}
          emptyMessage="No transactions recorded today yet."
        />
      </div>
    </div>
  );
}
