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
  Coins, Lock, Hourglass, AlertTriangle, Check, Calendar, Scale, Package, ArrowLeftRight, ExternalLink,
  CheckCircle
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
  warehouseSummary: {
    totalPartyDispatchToday: number;
    totalShopTransferToday: number;
    totalDispatchedToday: number;
    totalQuantitySentToday: number;
  };
}

// ── Staff payload ────────────────────────────────────────────────────────────
interface StaffSummary {
  role: 'CASHIER';
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

// ── Warehouse payload ─────────────────────────────────────────────────────────
interface WarehouseSummary {
  role: 'WAREHOUSE_MGMT';
  today: string;
  totalPartyDispatchToday: number;
  totalShopTransferToday: number;
  totalDispatchedToday: number;
  totalQuantitySentToday: number;
}

type SummaryData = OwnerSummary | StaffSummary | WarehouseSummary;

// ────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ────────────────────────────────────────────────────────────────────────────
function SkeletonDashboard({ cards }: { cards: number }) {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-stone-200 dark:bg-stone-800 rounded w-1/4 animate-pulse" />
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cards} gap-6`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-32 bg-stone-200 dark:bg-stone-800 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-stone-200 dark:bg-stone-800 rounded-2xl animate-pulse mt-6" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared column builders
// ────────────────────────────────────────────────────────────────────────────
const timeCol = (row: EntryRow) => (
  <span className="flex items-center gap-1.5 font-medium text-stone-500">
    <Clock className="w-3.5 h-3.5" />
    {formatTime(row.time)}
  </span>
);

const amountCol = (color: 'emerald' | 'rose' | 'amber') => (row: EntryRow) => (
  <span className={
    color === 'emerald' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' :
    color === 'rose'    ? 'text-red-700 dark:text-red-400 font-semibold' :
                         'text-amber-700 dark:text-amber-400 font-semibold'
  }>
    {color === 'rose' ? '– ' : '+'}{formatCurrency(row.amount)}
  </span>
);

const inflowColumns = [
  { header: 'Customer / Slip',  accessor: (r: EntryRow) => (
    <div>
      <div className="font-semibold text-stone-900 dark:text-stone-100">{r.customerName || '—'}</div>
      {r.slipNumber && <div className="text-[11px] text-stone-400 font-mono">{r.slipNumber}</div>}
    </div>
  )},
  { header: 'Remarks',          accessor: (r: EntryRow) => r.remarks || '—' },
  { header: 'Time',             accessor: timeCol },
  { header: 'Amount',           accessor: amountCol('emerald'), className: 'text-right font-mono' },
];

const salesColumns = [
  { header: 'Time',        accessor: timeCol },
  { header: 'Person Name', accessor: (r: EntryRow) => r.productName || '—' },
  { header: 'Customer',    accessor: (r: EntryRow) => r.customerName || '—' },
  { header: 'Notes',       accessor: (r: EntryRow) => r.notes || '—' },
  { header: 'Amount',      accessor: amountCol('amber'), className: 'text-right font-mono' },
];

const outflowColumns = [
  { header: 'Time',        accessor: timeCol },
  { header: 'Reason',      accessor: (r: EntryRow) => (r as any).reason || '—' },
  { header: 'Notes',       accessor: (r: EntryRow) => r.notes || '—' },
  { header: 'Amount',      accessor: amountCol('rose'), className: 'text-right font-mono' },
];

// ────────────────────────────────────────────────────────────────────────────
// Staff Dashboard
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
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight">
            My Dashboard
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Your activity for today ({formatDate(data.today)}).
          </p>
        </div>
        <button
          id="staff-dashboard-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-stone-200 dark:border-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-sm transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Balance Management Card Section */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-50">
                Shift Balance Management
              </h2>
              <p className="text-xs text-stone-400">
                Submit starting shift cash and closing counter physical tallies
              </p>
            </div>
          </div>
          {record && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-400">Verification:</span>
              {record.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3 h-3" />
                  Approved
                </span>
              )}
              {record.status === 'FLAGGED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-400" title={record.remarks || undefined}>
                  <AlertTriangle className="w-3 h-3" />
                  Flagged
                </span>
              )}
              {record.status === 'UNVERIFIED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Hourglass className="w-3 h-3" />
                  Pending Review
                </span>
              )}
            </div>
          )}
        </div>

        {record?.status === 'FLAGGED' && record.remarks && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-2 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold">Owner Flagged with notes:</span> {record.remarks}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opening Balance Form/State */}
          <div className="p-5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            {!hasOpening ? (
              <form onSubmit={handleSubmittingOpening} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    1. Opening Balance
                  </span>
                </div>
                <p className="text-xs text-stone-400 leading-normal">
                  Enter starting register cash before shift transactions begin.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={openingInput}
                      onChange={(e) => setOpeningInput(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-2 pl-6 pr-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingOpening}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {submittingOpening ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      1. Opening Balance
                    </span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                    Shift Started
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-stone-900 dark:text-stone-50 font-mono">
                    {formatCurrency(record!.openingBalance)}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Submitted today at {formatTime(record!.openingTime)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Closing Balance Form/State */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-300 ${
            !hasOpening
              ? 'border-dashed border-stone-200 dark:border-stone-700 opacity-60 bg-transparent'
              : 'border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50'
          }`}>
            {!hasOpening ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <Lock className="w-6 h-6 text-stone-300 dark:text-stone-700" />
                <p className="text-xs text-stone-400 font-medium">
                  Closing Tally Locked
                </p>
                <p className="text-[10px] text-stone-400 max-w-[200px]">
                  Submit opening balance at shift start to activate.
                </p>
              </div>
            ) : !hasClosing ? (
              <form onSubmit={handleSubmittingClosing} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      2. Closing Balance
                    </span>
                  </div>
                  {data.expectedClosingBalance !== null && (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Expected (System)</span>
                      <span className="text-sm font-black text-amber-700 dark:text-amber-400 font-mono">
                        {formatCurrency(data.expectedClosingBalance)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-stone-400 leading-normal">
                  Count physical cash at shift end and submit for audit.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={closingInput}
                      onChange={(e) => setClosingInput(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-2 pl-6 pr-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingClosing}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {submittingClosing ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      2. Closing Balance
                    </span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px]">
                    Shift Closed
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-stone-900 dark:text-stone-50 font-mono">
                    {formatCurrency(record!.closingBalance || 0)}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
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
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Current Net Cash</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Opening + Inflow + Sales − Outflow</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-stone-900 dark:text-stone-50 font-mono">
              {formatCurrency(
                (data.balanceRecord?.openingBalance ?? 0) + data.totalInflow + data.totalSales - data.totalOutflow
              )}
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">
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
            <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
            Recent Cash Inflow Entries
          </h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
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
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <ShoppingBag className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
            Recent Sales Entries
          </h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
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
          <div className="p-1.5 rounded-lg bg-red-500/10">
            <BadgeDollarSign className="w-4 h-4 text-red-700 dark:text-red-400" />
          </div>
          <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
            Recent Cash Outflow Entries
          </h2>
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400">
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
// Owner Dashboard — Cash Terminal Design
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
        <span className="flex items-center gap-1.5 font-medium text-stone-500">
          <Clock className="w-3.5 h-3.5" />
          {formatTime(row.time)}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: (row: Transaction) => {
        const types = {
          inflow:  { label: 'Inflow',  style: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
          sales:   { label: 'Sale',    style: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
          outflow: { label: 'Outflow', style: 'bg-red-500/10 text-red-700 dark:text-red-400' },
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
          ? 'text-red-700 dark:text-red-400 font-semibold'
          : 'text-emerald-700 dark:text-emerald-400 font-semibold';
        return <span className={color}>{sign} {formatCurrency(row.amount)}</span>;
      },
      className: 'text-right font-mono',
    },
  ];

  const netBalance = data.netBalance;
  const totalInflowAndSales = data.totalInflow + data.totalSales;

  return (
    <div className="space-y-8">
      {/* ── Hero Cash Position & Last 7 Days Sparkline ────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="label-caps">Cash Position · {formatDate(data.today).replace(/\//g, ' ')}</p>
          <p className="num mt-2 text-5xl sm:text-6xl font-semibold tracking-tight text-foreground">
            {formatCurrency(netBalance)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium">
            <span className="text-inflow flex items-center gap-1">
              ▲ Inflow {formatCurrency(totalInflowAndSales)}
            </span>
            <span className="text-outflow flex items-center gap-1">
              ▼ Outflow {formatCurrency(data.totalOutflow)}
            </span>
            <span className="label-caps rounded-full bg-secondary px-3 py-1 text-secondary-foreground font-semibold">
              {data.staffClosingBalance !== null ? 'APPROVED' : 'LIVE LEDGER'}
            </span>
          </div>
        </div>

        {/* 7-day sparkline bar chart matching reference image */}
        <div className="panel w-full max-w-xs p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Last 7 days</span>
            <span className="num text-xs text-muted-foreground">net {formatCurrency(netBalance)}</span>
          </div>
          <div className="mt-4 flex h-20 items-end gap-2">
            {[14.2, 16.8, 9.4, 21.1, 15.6, 22.4, 23.5].map((v, i, arr) => (
              <div
                key={i}
                title={`₹${v}K`}
                style={{ height: `${(v / 25) * 100}%` }}
                className={`flex-1 rounded-md ${
                  i === arr.length - 1 ? 'bg-chart-1' : 'bg-chart-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Outflow Alert Banner */}
      <AlertBanner
        totalInflow={data.totalInflow}
        totalSales={data.totalSales}
        totalOutflow={data.totalOutflow}
      />

      {/* ── Two-Column: Inflows + Balance Check ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Inflows Table (3/5) */}
        <section className="lg:col-span-3 panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Inflows · {formatDate(data.today).split('/').slice(0,2).join(' ')}
            </h2>
            <Link href="/inflow" className="text-sm text-primary transition-opacity hover:opacity-70">
              View all →
            </Link>
          </div>
          <DataTable
            columns={inflowColumns}
            data={data.recentTransactions.filter(t => t.type === 'inflow').slice(0, 5)}
            emptyMessage="No inflow entries recorded today."
          />
        </section>

        {/* Balance Check Card (2/5) */}
        <section className="lg:col-span-2 panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Balance check
            </h2>
            <span className="label-caps rounded-full bg-secondary px-3 py-1 text-secondary-foreground font-semibold">
              {data.staffClosingBalance !== null ? 'APPROVED' : 'SYSTEM'}
            </span>
          </div>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Opening balance</dt>
              <dd className="num font-medium text-foreground">
                {formatCurrency(data.openingBalanceTotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Net movement</dt>
              <dd className={`num font-medium ${
                (totalInflowAndSales - data.totalOutflow) >= 0 ? 'text-inflow' : 'text-outflow'
              }`}>
                {(totalInflowAndSales - data.totalOutflow) >= 0 ? '+' : ''}
                {formatCurrency(totalInflowAndSales - data.totalOutflow)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <dt className="font-medium text-foreground">Closing balance</dt>
              <dd className="num text-xl font-semibold text-primary">
                {formatCurrency(netBalance)}
              </dd>
            </div>
          </dl>

          {data.staffClosingBalance !== null && (
            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-card text-inflow font-bold">
                ✓
              </span>
              <div>
                <span className="block text-sm font-medium text-foreground">Verified by Staff</span>
                <span className="num block text-xs text-muted-foreground">
                  Staff closing: {formatCurrency(data.staffClosingBalance)}
                </span>
              </div>
            </div>
          )}

          <Link
            href="/balance"
            className="block w-full text-center py-3 rounded-2xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Open reconciliation
          </Link>
        </section>
      </div>

      {/* ── Outflow & Dispatch Section ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Outflow & dispatch (3/5) */}
        <section className="lg:col-span-3 panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Outflow & dispatch
            </h2>
            <Link
              href="/reports"
              className="text-sm text-primary transition-opacity hover:opacity-70"
            >
              Reports →
            </Link>
          </div>
          <DataTable
            columns={outflowColumns}
            data={data.recentTransactions.filter(t => t.type === 'outflow').slice(0, 5)}
            emptyMessage="No outflow entries recorded today."
          />
        </section>

        {/* Quick Stats Grid (2/5) */}
        <section className="lg:col-span-2 panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden">
          <div className="p-6">
            <p className="label-caps">Inflow Today</p>
            <p className="num mt-2 text-2xl font-semibold text-foreground">{formatCurrency(totalInflowAndSales)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.inflowCount + data.salesCount} slips</p>
          </div>
          <div className="p-6">
            <p className="label-caps">Outflow Today</p>
            <p className="num mt-2 text-2xl font-semibold text-foreground">{formatCurrency(data.totalOutflow)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.outflowCount} slips</p>
          </div>
          <div className="p-6">
            <p className="label-caps">Cash Difference</p>
            <p className={`num mt-2 text-2xl font-semibold ${
              data.cashDifference === null ? 'text-muted-foreground'
              : data.cashDifference === 0 ? 'text-inflow'
              : 'text-outflow'
            }`}>
              {data.cashDifference !== null ? formatCurrency(data.cashDifference) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.cashDifference === null ? 'Awaiting closing'
              : data.cashDifference === 0 ? 'Balanced ✓'
              : data.cashDifference > 0 ? 'Excess cash'
              : 'Cash shortage'}
            </p>
          </div>
          <div className="p-6">
            <p className="label-caps">Total Entries</p>
            <p className="num mt-2 text-2xl font-semibold text-foreground">{data.recentTransactions.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Recorded today</p>
          </div>
        </section>
      </div>

      {/* Combined Recent Transactions */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight">
          Recent Register Transactions
        </h2>
        <DataTable
          columns={combinedColumns}
          data={data.recentTransactions}
          emptyMessage="No transactions recorded today yet."
        />
      </section>

      {/* Warehouse Management Overview (Owner only) */}
      {data.warehouseSummary && (
        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">Warehouse Management Overview</h2>
                <p className="text-xs text-stone-400">Today's warehouse dispatch and shop stock transfer activity</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/party-dispatch" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
                <Package className="w-3.5 h-3.5" />
                Party Dispatch
              </Link>
              <Link href="/shop-transfer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Shop Transfer
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 text-center">
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{data.warehouseSummary.totalPartyDispatchToday}</div>
              <div className="text-xs text-stone-500 mt-1">Party Dispatches</div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-700 text-center">
              <div className="text-2xl font-black text-stone-700 dark:text-stone-300">{data.warehouseSummary.totalDispatchedToday}</div>
              <div className="text-xs text-stone-500 mt-1">Total Qty Dispatched</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 text-center">
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{data.warehouseSummary.totalShopTransferToday}</div>
              <div className="text-xs text-stone-500 mt-1">Shop Transfers</div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-700 text-center">
              <div className="text-2xl font-black text-stone-700 dark:text-stone-300">{data.warehouseSummary.totalQuantitySentToday}</div>
              <div className="text-xs text-stone-500 mt-1">Total Qty Transferred</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

import Link from 'next/link';

// ────────────────────────────────────────────────────────────────────────────
// Warehouse Dashboard
// ────────────────────────────────────────────────────────────────────────────
function WarehouseDashboard({ data, onRefresh, refreshing }: {
  data: WarehouseSummary;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight">
            Warehouse Dashboard
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Today's dispatch and transfer summary for {formatDate(data.today)}.
          </p>
        </div>
        <button
          id="warehouse-dashboard-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-stone-200 dark:border-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-sm transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Party Dispatches Today"
          value={String(data.totalPartyDispatchToday)}
          icon={<Package className="w-6 h-6" />}
          description="Number of party dispatch entries"
          color="amber"
        />
        <KPICard
          title="Total Qty Dispatched"
          value={String(data.totalDispatchedToday)}
          icon={<ArrowUpRight className="w-6 h-6" />}
          description="Sum of quantities dispatched today"
          color="amber"
        />
        <KPICard
          title="Shop Transfers Today"
          value={String(data.totalShopTransferToday)}
          icon={<ArrowLeftRight className="w-6 h-6" />}
          description="Number of shop transfer entries"
          color="emerald"
        />
        <KPICard
          title="Total Qty Transferred"
          value={String(data.totalQuantitySentToday)}
          icon={<TrendingUp className="w-6 h-6" />}
          description="Sum of quantities transferred today"
          color="amber"
        />
      </div>

      {/* Quick Access */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          Quick Access — Registers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/party-dispatch"
            className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-50">Party Dispatch Register</div>
                <div className="text-xs text-stone-500">Log outbound dispatches to parties</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors" />
          </Link>

          <Link
            href="/shop-transfer"
            className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-50">Shop Stock Transfer Register</div>
                <div className="text-xs text-stone-500">Log stock transfers from warehouse to shop</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}

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

  const role = user?.role;

  if (loading) return <SkeletonDashboard cards={role === 'OWNER' ? 4 : role === 'WAREHOUSE_MGMT' ? 4 : 3} />;
  if (!data)   return null;

  // Route to correct dashboard by role
  if (data.role === 'WAREHOUSE_MGMT') {
    return (
      <WarehouseDashboard
        data={data}
        onRefresh={() => fetchSummary(true)}
        refreshing={refreshing}
      />
    );
  }

  if (data.role === 'CASHIER') {
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
