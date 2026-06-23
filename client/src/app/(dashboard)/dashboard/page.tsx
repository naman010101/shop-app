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
  Coins, Lock, Hourglass, AlertTriangle, Check, Calendar, Scale
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
  openingBalanceTotal: number;
  netBalance: number;
  systemExpectedClosing: number;
  staffClosingBalance: number | null;
  cashDifference: number | null;
  lastWorkingDayNetCash: number | null;
  lastWorkingDate: string | null;
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
  expectedClosingBalance: number | null;
  balanceRecord: {
    id: string;
    date: string;
    openingTime: string;
    openingBalance: number;
    closingTime: string | null;
    closingBalance: number | null;
    status: string;
    remarks: string | null;
  } | null;
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
      <div className={`grid grid-cols-1 sm:grid-cols-${cards === 3 ? '2' : '2'} lg:grid-cols-${cards} gap-6`}>
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
  { header: 'Time',             accessor: timeCol },
  { header: 'Slip #',           accessor: (r: EntryRow) => r.slipNumber || '—' },
  { header: 'Customer/Product', accessor: (r: EntryRow) => r.customerName || '—' },
  { header: 'Remarks',          accessor: (r: EntryRow) => r.remarks || '—' },
  { header: 'Amount',           accessor: amountCol('emerald'), className: 'text-right font-mono' },
];

const salesColumns = [
  { header: 'Time',        accessor: timeCol },
  { header: 'Person Name', accessor: (r: EntryRow) => r.productName || '—' },
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
  const [openingInput, setOpeningInput] = useState('');
  const [closingInput, setClosingInput] = useState('');
  const [submittingOpening, setSubmittingOpening] = useState(false);
  const [submittingClosing, setSubmittingClosing] = useState(false);

  const handleSubmittingOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingInput.trim()) return;
    setSubmittingOpening(true);
    try {
      await api.post('/balance/opening', { openingBalance: parseFloat(openingInput) });
      toast.success('Opening balance submitted successfully!');
      setOpeningInput('');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit opening balance.';
      toast.error(msg);
    } finally {
      setSubmittingOpening(false);
    }
  };

  const handleSubmittingClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingInput.trim()) return;
    setSubmittingClosing(true);
    try {
      await api.post('/balance/closing', { closingBalance: parseFloat(closingInput) });
      toast.success('Closing balance submitted successfully!');
      setClosingInput('');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit closing balance.';
      toast.error(msg);
    } finally {
      setSubmittingClosing(false);
    }
  };

  const hasOpening = !!data.balanceRecord;
  const hasClosing = !!data.balanceRecord?.closingBalance;
  const record = data.balanceRecord;

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

      {/* Balance Management Card Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Shift Balance Management
              </h2>
              <p className="text-xs text-slate-400">
                Submit starting shift cash and closing counter physical tallies
              </p>
            </div>
          </div>
          {record && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Verification:</span>
              {record.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3 h-3" />
                  Approved
                </span>
              )}
              {record.status === 'FLAGGED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400" title={record.remarks || undefined}>
                  <AlertTriangle className="w-3 h-3" />
                  Flagged
                </span>
              )}
              {record.status === 'UNVERIFIED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Hourglass className="w-3 h-3" />
                  Pending Review
                </span>
              )}
            </div>
          )}
        </div>

        {record?.status === 'FLAGGED' && record.remarks && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold">Owner Flagged with notes:</span> {record.remarks}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opening Balance Form/State */}
          <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            {!hasOpening ? (
              <form onSubmit={handleSubmittingOpening} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    1. Opening Balance
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">
                  Enter starting register cash before shift transactions begin.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={openingInput}
                      onChange={(e) => setOpeningInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-6 pr-3 text-sm outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingOpening}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {submittingOpening ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      1. Opening Balance
                    </span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                    Shift Started
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                    {formatCurrency(record!.openingBalance)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Submitted today at {formatTime(record!.openingTime)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Closing Balance Form/State */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-300 ${
            !hasOpening
              ? 'border-dashed border-slate-200 dark:border-slate-800 opacity-60 bg-transparent'
              : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
          }`}>
            {!hasOpening ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <Lock className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                <p className="text-xs text-slate-400 font-medium">
                  Closing Tally Locked
                </p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">
                  Submit opening balance at shift start to activate.
                </p>
              </div>
            ) : !hasClosing ? (
              <form onSubmit={handleSubmittingClosing} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      2. Closing Balance
                    </span>
                  </div>
                  {data.expectedClosingBalance !== null && (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expected (System)</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {formatCurrency(data.expectedClosingBalance)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-normal">
                  Count physical cash at shift end and submit for audit.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={closingInput}
                      onChange={(e) => setClosingInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-6 pr-3 text-sm outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingClosing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {submittingClosing ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      2. Closing Balance
                    </span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">
                    Shift Closed
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                    {formatCurrency(record!.closingBalance || 0)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Submitted today at {formatTime(record!.closingTime || '')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Net Cash Display (only when opening balance submitted) */}
      {data.balanceRecord && (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Current Net Cash</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Opening + Inflow + Sales − Outflow</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
              {formatCurrency(
                (data.balanceRecord?.openingBalance ?? 0) + data.totalInflow + data.totalSales - data.totalOutflow
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Opening: {formatCurrency(data.balanceRecord?.openingBalance ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* 2 KPI Cards — Cash Inflow | Cash Outflow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <KPICard
          title="Cash Inflow"
          value={formatCurrency(data.totalInflow + data.totalSales)}
          icon={<ArrowDownLeft className="w-6 h-6" />}
          description={`${data.inflowCount + data.salesCount} cash-in entry/entries today (incl. sales)`}
          color="emerald"
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
        if (row.type === 'sales')   return `Person: ${row.productName || 'N/A'}`;
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

      {/* Opening Balance Info Bar */}
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3">
        <Coins className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-500">Today's Opening Balance:</span>
        <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(data.openingBalanceTotal)}</span>
        <span className="ml-auto text-[10px] text-slate-400">Formula: Opening + Inflow + Sales − Outflow = Net Cash</span>
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Inflow Today"
          value={formatCurrency(data.totalInflow + data.totalSales)}
          icon={<ArrowDownLeft className="w-6 h-6" />}
          description={`${data.inflowCount + data.salesCount} inflow + sales entries`}
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
          title="Current Net Cash"
          value={formatCurrency(data.netBalance)}
          icon={<Wallet className="w-6 h-6" />}
          description="Opening + Inflow + Sales − Outflow"
          color={data.netBalance >= 0 ? 'amber' : 'rose'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Last Working Day Net"
          value={data.lastWorkingDayNetCash !== null ? formatCurrency(data.lastWorkingDayNetCash) : '—'}
          icon={<Calendar className="w-6 h-6" />}
          description={data.lastWorkingDate ? `As of ${formatDate(data.lastWorkingDate)}` : 'No previous records'}
          color="indigo"
        />
        <KPICard
          title="Expected Closing Bal."
          value={formatCurrency(data.systemExpectedClosing)}
          icon={<Scale className="w-6 h-6" />}
          description="System calculated"
          color="amber"
        />
        <KPICard
          title="Staff Closing Bal."
          value={data.staffClosingBalance !== null ? formatCurrency(data.staffClosingBalance) : '—'}
          icon={<Coins className="w-6 h-6" />}
          description={data.staffClosingBalance !== null ? 'Manually submitted' : 'Not submitted yet'}
          color={data.staffClosingBalance !== null ? 'emerald' : 'indigo'}
        />
        <KPICard
          title="Cash Difference"
          value={data.cashDifference !== null ? formatCurrency(data.cashDifference) : '—'}
          icon={<AlertTriangle className="w-6 h-6" />}
          description={
            data.cashDifference === null ? 'Awaiting closing'
            : data.cashDifference === 0 ? 'Balanced ✓'
            : data.cashDifference > 0 ? 'Excess cash'
            : 'Cash shortage'
          }
          color={
            data.cashDifference === null ? 'indigo'
            : data.cashDifference === 0 ? 'emerald'
            : data.cashDifference > 0 ? 'amber'
            : 'rose'
          }
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
