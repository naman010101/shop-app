'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import KPICard from '@/components/KPICard';
import AlertBanner from '@/components/AlertBanner';
import DataTable from '@/components/DataTable';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import {
  ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet,
  RefreshCw, Clock, ShoppingBag, BadgeDollarSign, Banknote,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Shared transaction entry shape ───────────────────────────────────────────
interface EntryRow {
  id: string;
  amount: number;
  date: string;
  time: string;
  customerName?: string;
  productName?: string;
  reason?: string;
  slipNumber?: string;
  notes?: string;
  remarks?: string;
  user: { username: string };
}

// ── Combined transaction (owner only) ───────────────────────────────────────
interface Transaction extends EntryRow {
  type: 'inflow' | 'sales' | 'outflow';
}

// ── Owner payload ────────────────────────────────────────────────────────────
interface OwnerSummary {
  role: 'OWNER';
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

// ── Staff payload ────────────────────────────────────────────────────────────
interface StaffSummary {
  role: 'STAFF';
  today: string;
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  inflowCount: number;
  salesCount: number;
  outflowCount: number;
  recentInflows: EntryRow[];
  recentSales: EntryRow[];
  recentOutflows: EntryRow[];
}

type SummaryData = OwnerSummary | StaffSummary;

// ────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ────────────────────────────────────────────────────────────────────────────
function SkeletonDashboard({ cards }: { cards: number }) {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse" />
      <div className={`grid grid-cols-1 sm:grid-cols-${cards === 3 ? '3' : '2'} lg:grid-cols-${cards} gap-6`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse mt-6" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared column builders
// ────────────────────────────────────────────────────────────────────────────
const timeCol = (row: EntryRow) => (
  <span className="flex items-center gap-1.5 font-medium text-slate-500">
    <Clock className="w-3.5 h-3.5" />
    {formatTime(row.time)}
  </span>
);

const amountCol = (color: 'emerald' | 'rose' | 'indigo') => (row: EntryRow) => (
  <span className={
    color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
    color === 'rose'    ? 'text-rose-600 dark:text-rose-400 font-semibold' :
                         'text-indigo-600 dark:text-indigo-400 font-semibold'
  }>
    {color === 'rose' ? '– ' : '+ '}{formatCurrency(row.amount)}
  </span>
);

const inflowColumns = [
  { header: 'Time',        accessor: timeCol },
  { header: 'Slip #',      accessor: (r: EntryRow) => r.slipNumber || '—' },
  { header: 'Customer',    accessor: (r: EntryRow) => r.customerName || '—' },
  { header: 'Remarks',     accessor: (r: EntryRow) => r.remarks || '—' },
  { header: 'Amount',      accessor: amountCol('emerald'), className: 'text-right font-mono' },
];

const salesColumns = [
  { header: 'Time',        accessor: timeCol },
  { header: 'Product',     accessor: (r: EntryRow) => r.productName || '—' },
  { header: 'Customer',    accessor: (r: EntryRow) => r.customerName || '—' },
  { header: 'Notes',       accessor: (r: EntryRow) => r.notes || '—' },
  { header: 'Amount',      accessor: amountCol('indigo'), className: 'text-right font-mono' },
];

const outflowColumns = [
  { header: 'Time',        accessor: timeCol },
  { header: 'Reason',      accessor: (r: EntryRow) => (r as any).reason || '—' },
  { header: 'Notes',       accessor: (r: EntryRow) => r.notes || '—' },
  { header: 'Amount',      accessor: amountCol('rose'), className: 'text-right font-mono' },
];

// ────────────────────────────────────────────────────────────────────────────
// Staff Dashboard — 3 cards + 3 separated recent entry tables
// Admin-level financial summaries (Net Cash Balance, Total Flow) are hidden.
// ────────────────────────────────────────────────────────────────────────────
function StaffDashboard({ data, onRefresh, refreshing }: {
  data: StaffSummary;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            My Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your activity for today ({formatDate(data.today)}).
          </p>
        </div>
        <button
          id="staff-dashboard-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* 3 KPI Cards — Cash Inflow | Sales | Cash Outflow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KPICard
          title="Cash Inflow"
          value={formatCurrency(data.totalInflow)}
          icon={<ArrowDownLeft className="w-6 h-6" />}
          description={`${data.inflowCount} deposit${data.inflowCount !== 1 ? 's' : ''} today`}
          color="emerald"
        />
        <KPICard
          title="Sales"
          value={formatCurrency(data.totalSales)}
          icon={<TrendingUp className="w-6 h-6" />}
          description={`${data.salesCount} bill${data.salesCount !== 1 ? 's' : ''} today`}
          color="indigo"
        />
        <KPICard
          title="Cash Outflow"
          value={formatCurrency(data.totalOutflow)}
          icon={<ArrowUpRight className="w-6 h-6" />}
          description={`${data.outflowCount} expense${data.outflowCount !== 1 ? 's' : ''} today`}
          color="rose"
        />
      </div>

      {/* Recent Cash Inflow Entries */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            Recent Cash Inflow Entries
          </h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {data.inflowCount} today
          </span>
        </div>
        <DataTable
          columns={inflowColumns}
          data={data.recentInflows}
          emptyMessage="No cash inflow entries recorded today."
        />
      </section>

      {/* Recent Sales Entries */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10">
            <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            Recent Sales Entries
          </h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {data.salesCount} today
          </span>
        </div>
        <DataTable
          columns={salesColumns}
          data={data.recentSales}
          emptyMessage="No sales entries recorded today."
        />
      </section>

      {/* Recent Cash Outflow Entries */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/10">
            <BadgeDollarSign className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            Recent Cash Outflow Entries
          </h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {data.outflowCount} today
          </span>
        </div>
        <DataTable
          columns={outflowColumns}
          data={data.recentOutflows}
          emptyMessage="No cash outflow entries recorded today."
        />
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Owner Dashboard (4 cards + combined recent transactions — unchanged UX)
// ────────────────────────────────────────────────────────────────────────────
function OwnerDashboard({ data, onRefresh, refreshing }: {
  data: OwnerSummary;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const combinedColumns = [
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
          inflow:  { label: 'Inflow',  style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
          sales:   { label: 'Sale',    style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
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
        if (row.type === 'inflow')  return `Customer: ${row.customerName || 'N/A'}`;
        if (row.type === 'sales')   return `Product: ${row.productName || 'N/A'}`;
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
        const sign  = row.type === 'outflow' ? '–' : '+';
        const color = row.type === 'outflow'
          ? 'text-rose-600 dark:text-rose-400 font-semibold'
          : 'text-emerald-600 dark:text-emerald-400 font-semibold';
        return <span className={color}>{sign} {formatCurrency(row.amount)}</span>;
      },
      className: 'text-right font-mono',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time sales and cash register activity for today ({formatDate(data.today)}).
          </p>
        </div>
        <button
          id="owner-dashboard-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Outflow Alert */}
      <AlertBanner
        totalInflow={data.totalInflow}
        totalSales={data.totalSales}
        totalOutflow={data.totalOutflow}
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Inflow Today"
          value={formatCurrency(data.totalInflow)}
          icon={<ArrowDownLeft className="w-6 h-6" />}
          description={`${data.inflowCount} deposits`}
          color="emerald"
        />
        <KPICard
          title="Total Sales Today"
          value={formatCurrency(data.totalSales)}
          icon={<TrendingUp className="w-6 h-6" />}
          description={`${data.salesCount} bills`}
          color="indigo"
        />
        <KPICard
          title="Total Outflow Today"
          value={formatCurrency(data.totalOutflow)}
          icon={<ArrowUpRight className="w-6 h-6" />}
          description={`${data.outflowCount} expenses`}
          color="rose"
        />
        <KPICard
          title="Net Cash Balance"
          value={formatCurrency(data.netBalance)}
          icon={<Wallet className="w-6 h-6" />}
          description="Inflows + Sales − Outflows"
          color={data.netBalance >= 0 ? 'amber' : 'rose'}
        />
      </div>

      {/* Combined Recent Transactions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Recent Register Transactions
        </h2>
        <DataTable
          columns={combinedColumns}
          data={data.recentTransactions}
          emptyMessage="No transactions recorded today yet."
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Root page — fetches data then delegates to the correct role-based dashboard.
// The backend API enforces role-based data filtering:
//   STAFF → receives only their own Cash Inflow, Sales, Cash Outflow data.
//   OWNER → receives full financial overview including Net Cash Balance.
// ────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const response = await api.get('/dashboard/summary');
      setData(response.data);
    } catch {
      toast.error('Failed to load dashboard summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const isOwner = user?.role === 'OWNER';

  if (loading) return <SkeletonDashboard cards={isOwner ? 4 : 3} />;
  if (!data)   return null;

  // Role check: backend enforces data access; frontend renders appropriate view.
  if (data.role === 'STAFF') {
    return (
      <StaffDashboard
        data={data}
        onRefresh={() => fetchSummary(true)}
        refreshing={refreshing}
      />
    );
  }

  return (
    <OwnerDashboard
      data={data}
      onRefresh={() => fetchSummary(true)}
      refreshing={refreshing}
    />
  );
}
