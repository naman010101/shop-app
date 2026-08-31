'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import KPICard from '@/components/KPICard';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import {
  Wallet, Coins, Lock, Unlock, Hourglass, CheckCircle2,
  AlertTriangle, Search, Edit2, Check, RefreshCw, Calendar, User, History
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BalanceRecord {
  id: string;
  date: string;
  openingTime: string;
  openingBalance: number;
  closingTime: string | null;
  closingBalance: number | null;
  status: 'UNVERIFIED' | 'APPROVED' | 'FLAGGED';
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: { username: string };
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  expectedClosingBalance: number;
  variance: number | null;
}

interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  details: any;
  createdAt: string;
  user: { username: string };
}

export default function BalanceManagementPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // ── STAFF STATE ────────────────────────────────────────────────────────────
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [staffHistory, setStaffHistory] = useState<BalanceRecord[]>([]);
  const [openingInput, setOpeningInput] = useState('');
  const [closingInput, setClosingInput] = useState('');
  const [submittingOpening, setSubmittingOpening] = useState(false);
  const [submittingClosing, setSubmittingClosing] = useState(false);

  // ── ADMIN STATE ────────────────────────────────────────────────────────────
  const [adminRecords, setAdminRecords] = useState<BalanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [usersList, setUsersList] = useState<{ id: string; username: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'audit'>('reconciliation');

  // Admin Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals / Action States
  const [selectedRecord, setSelectedRecord] = useState<BalanceRecord | null>(null);
  const [actionType, setActionType] = useState<'verify' | 'edit' | null>(null);
  const [actionStatus, setActionStatus] = useState<'APPROVED' | 'FLAGGED' | ''>('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [editOpening, setEditOpening] = useState('');
  const [editClosing, setEditClosing] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // ── FETCH DATA ────────────────────────────────────────────────────────────
  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        api.get('/balance/today'),
        api.get('/balance/list')
      ]);
      setTodaySummary(todayRes.data);
      setStaffHistory(historyRes.data.records);
    } catch {
      toast.error('Failed to load balance summaries.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        userId: filterUser || undefined,
        status: filterStatus || undefined
      };
      
      const [recordsRes, usersRes, logsRes] = await Promise.all([
        api.get('/balance/list', { params }),
        api.get('/users'),
        api.get('/balance/admin/audit-logs')
      ]);

      setAdminRecords(recordsRes.data.records);
      setUsersList(usersRes.data.users);
      setAuditLogs(logsRes.data.logs);
    } catch {
      toast.error('Failed to load admin reconciliation desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchAdminData();
    } else {
      fetchStaffData();
    }
  }, [isOwner, filterStartDate, filterEndDate, filterUser, filterStatus]);

  // ── STAFF ACTION HANDLERS ──────────────────────────────────────────────────
  const handleStaffOpeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingInput.trim()) return;
    setSubmittingOpening(true);
    try {
      await api.post('/balance/opening', { openingBalance: parseFloat(openingInput) });
      toast.success('Opening balance submitted!');
      setOpeningInput('');
      fetchStaffData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit opening balance.';
      toast.error(msg);
    } finally {
      setSubmittingOpening(false);
    }
  };

  const handleStaffClosingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingInput.trim()) return;
    setSubmittingClosing(true);
    try {
      await api.post('/balance/closing', { closingBalance: parseFloat(closingInput) });
      toast.success('Closing balance submitted!');
      setClosingInput('');
      fetchStaffData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit closing balance.';
      toast.error(msg);
    } finally {
      setSubmittingClosing(false);
    }
  };

  // ── ADMIN ACTION HANDLERS ──────────────────────────────────────────────────
  const handleVerifyClick = (record: BalanceRecord, status: 'APPROVED' | 'FLAGGED') => {
    setSelectedRecord(record);
    setActionType('verify');
    setActionStatus(status);
    setAdminRemarks(record.remarks || '');
  };

  const handleEditClick = (record: BalanceRecord) => {
    setSelectedRecord(record);
    setActionType('edit');
    setEditOpening(record.openingBalance.toString());
    setEditClosing(record.closingBalance !== null ? record.closingBalance.toString() : '');
    setAdminRemarks(record.remarks || '');
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !actionStatus) return;
    setActionSubmitting(true);
    try {
      await api.put(`/balance/admin/verify/${selectedRecord.id}`, {
        status: actionStatus,
        remarks: adminRemarks.trim() || undefined
      });
      toast.success(`Record successfully marked as ${actionStatus}`);
      setSelectedRecord(null);
      fetchAdminData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update record status.';
      toast.error(msg);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setActionSubmitting(true);
    try {
      await api.put(`/balance/admin/update/${selectedRecord.id}`, {
        openingBalance: parseFloat(editOpening),
        closingBalance: editClosing.trim() !== '' ? parseFloat(editClosing) : null,
        remarks: adminRemarks.trim() || undefined
      });
      toast.success('Record modified by admin successfully.');
      setSelectedRecord(null);
      fetchAdminData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to edit balance record.';
      toast.error(msg);
    } finally {
      setActionSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterUser('');
    setFilterStatus('');
  };

  // ── RENDER STAFF VIEW ──────────────────────────────────────────────────────
  if (!isOwner) {
    const record = todaySummary?.record;
    const totals = todaySummary?.totals;
    const hasOpening = !!record;
    const hasClosing = !!record?.closingBalance;

    const historyColumns = [
      { header: 'Date', accessor: (row: BalanceRecord) => formatDate(row.date) },
      { header: 'Opening Balance', accessor: (row: BalanceRecord) => formatCurrency(row.openingBalance), className: 'font-mono' },
      { header: 'Opening Time', accessor: (row: BalanceRecord) => formatTime(row.openingTime) },
      { header: 'Closing Balance', accessor: (row: BalanceRecord) => row.closingBalance !== null ? formatCurrency(row.closingBalance) : '—', className: 'font-mono' },
      { header: 'Closing Time', accessor: (row: BalanceRecord) => row.closingTime ? formatTime(row.closingTime) : '—' },
      {
        header: 'Verification Status',
        accessor: (row: BalanceRecord) => {
          const styles = {
            APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            FLAGGED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
            UNVERIFIED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          };
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[row.status]}`}>
              {row.status === 'APPROVED' && <Check className="w-3 h-3 mr-1" />}
              {row.status === 'FLAGGED' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {row.status === 'UNVERIFIED' && <Hourglass className="w-3 h-3 mr-1" />}
              {row.status}
            </span>
          );
        }
      },
      { header: 'Remarks', accessor: (row: BalanceRecord) => row.remarks || '—' }
    ];

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-700 dark:text-amber-500" />
            <span>Balance Desk</span>
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Submit shift balances and view historical tallies for your user.
          </p>
        </div>

        {/* 1. Shift Balance widget */}
        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-50">
                  Shift Balance Entry
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400" title={record.remarks || undefined}>
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
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-semibold">Owner Flagged with notes:</span> {record.remarks}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opening Balance */}
            <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex flex-col justify-between min-h-[160px]">
              {!hasOpening ? (
                <form onSubmit={handleStaffOpeningSubmit} className="space-y-4">
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
                        className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-2 pl-6 pr-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingOpening}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
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
                      {formatCurrency(record.openingBalance)}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Submitted today at {formatTime(record.openingTime)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Closing Balance */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[160px] transition-all duration-300 ${
              !hasOpening
                ? 'border-dashed border-stone-200 dark:border-stone-800 opacity-60'
                : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50'
            }`}>
              {!hasOpening ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                  <Lock className="w-6 h-6 text-stone-300 dark:text-stone-700" />
                  <p className="text-xs text-stone-400 font-medium">Closing Tally Locked</p>
                  <p className="text-[10px] text-stone-400 max-w-[200px]">
                    Submit opening balance at shift start to activate.
                  </p>
                </div>
              ) : !hasClosing ? (
                <form onSubmit={handleStaffClosingSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-700 dark:text-amber-500" />
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      2. Closing Balance
                    </span>
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
                        className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-2 pl-6 pr-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingClosing}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                      {submittingClosing ? 'Saving...' : 'Submit'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-700 dark:text-amber-500" />
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
                      {formatCurrency(record.closingBalance || 0)}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Submitted today at {formatTime(record.closingTime || '')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. Today's Totals Section */}
        {hasOpening && totals && (
          <section className="space-y-3">
            <h3 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
              Shift Cumulative Activity (Today)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <KPICard
                title="Cash Inflow (incl. Sales)"
                value={formatCurrency(totals.inflows + totals.sales)}
                icon={<Coins className="w-5 h-5" />}
                color="emerald"
              />
              <KPICard
                title="Cash Outflow"
                value={formatCurrency(totals.outflows)}
                icon={<Coins className="w-5 h-5" />}
                color="rose"
              />
              <KPICard
                title="Shift Book Value"
                value={formatCurrency(record.openingBalance + totals.inflows + totals.sales - totals.outflows)}
                icon={<Wallet className="w-5 h-5" />}
                color="amber"
              />
            </div>
          </section>
        )}

        {/* 3. Staff Balance History */}
        <section className="space-y-3">
          <h3 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <History className="w-4 h-4 text-stone-400" />
            <span>My Shift History</span>
          </h3>
          <DataTable
            columns={historyColumns}
            data={staffHistory}
            isLoading={loading}
            emptyMessage="No historical shift balances logged."
          />
        </section>
      </div>
    );
  }

  // ── RENDER ADMIN VIEW (OWNER) ──────────────────────────────────────────────
  const reconciliationColumns = [
    {
      header: 'Staff User',
      accessor: (row: BalanceRecord) => (
        <span className="font-semibold text-stone-800 dark:text-stone-200">
          {row.user?.username}
        </span>
      )
    },
    { header: 'Date', accessor: (row: BalanceRecord) => formatDate(row.date) },
    {
      header: 'Opening Bal.',
      accessor: (row: BalanceRecord) => (
        <div className="text-xs">
          <span className="font-semibold font-mono">{formatCurrency(row.openingBalance)}</span>
          <span className="block text-[10px] text-stone-400">{formatTime(row.openingTime)}</span>
        </div>
      )
    },
    {
      header: 'Closing Bal.',
      accessor: (row: BalanceRecord) => (
        <div className="text-xs">
          <span className="font-semibold font-mono">{row.closingBalance !== null ? formatCurrency(row.closingBalance) : '—'}</span>
          {row.closingTime && <span className="block text-[10px] text-stone-400">{formatTime(row.closingTime)}</span>}
        </div>
      )
    },
    {
      header: 'Register Inflows',
      accessor: (row: BalanceRecord) => (
        <div className="text-xs font-mono text-stone-600 dark:text-stone-400">
          <div>In: {formatCurrency(row.totalInflow)}</div>
          <div>Sales: {formatCurrency(row.totalSales)}</div>
        </div>
      )
    },
    {
      header: 'Register Outflows',
      accessor: (row: BalanceRecord) => (
        <span className="font-mono text-rose-700 dark:text-rose-400 font-semibold">{formatCurrency(row.totalOutflow)}</span>
      )
    },
    {
      header: 'Expected Closing Bal.',
      accessor: (row: BalanceRecord) => (
        <span className="font-semibold font-mono text-stone-800 dark:text-stone-200">
          {formatCurrency(row.expectedClosingBalance)}
        </span>
      )
    },
    {
      header: 'Difference',
      accessor: (row: BalanceRecord) => {
        if (row.variance === null) return <span className="text-stone-400 italic">Unclosed</span>;
        const color = row.variance === 0 
          ? 'text-emerald-700 dark:text-emerald-400 font-semibold' 
          : row.variance > 0
          ? 'text-amber-700 dark:text-amber-400 font-semibold'
          : 'text-rose-700 dark:text-rose-400 font-semibold';
        
        const label = row.variance === 0 
          ? 'Balanced' 
          : row.variance > 0 
          ? 'Excess Cash' 
          : 'Cash Shortage';
          
        return (
          <div className="flex flex-col">
            <span className={`font-mono ${color}`}>{formatCurrency(row.variance)}</span>
            <span className={`text-[9px] font-bold ${color}`}>{label}</span>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: (row: BalanceRecord) => {
        if (row.variance === null) {
          return (
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              OPEN
            </span>
          );
        }
        
        if (row.variance === 0) {
          return (
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Balanced
            </span>
          );
        }
        
        if (row.variance > 0) {
          return (
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Excess Cash
            </span>
          );
        }
        
        return (
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400">
            Cash Shortage
          </span>
        );
      }
    },
    {
      header: 'Admin Verif.',
      accessor: (row: BalanceRecord) => {
        const styles = {
          APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          FLAGGED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
          UNVERIFIED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        };
        return (
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (row: BalanceRecord) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => handleVerifyClick(row, 'APPROVED')}
            disabled={row.status === 'APPROVED'}
            className="p-1 rounded-lg bg-emerald-500/10 text-emerald-700 hover:bg-emerald-700 hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-600 transition-colors disabled:opacity-30 cursor-pointer"
            title="Approve Tally"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleVerifyClick(row, 'FLAGGED')}
            disabled={row.status === 'FLAGGED'}
            className="p-1 rounded-lg bg-rose-500/10 text-rose-700 hover:bg-rose-700 hover:text-white dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
            title="Flag/Mark Mismatch"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleEditClick(row)}
            className="p-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-700 hover:text-white dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-600 transition-colors cursor-pointer"
            title="Modify Balances (Audit-Logged)"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ];

  const auditColumns = [
    { header: 'Time', accessor: (row: AuditLog) => `${formatDate(row.createdAt.split('T')[0])} ${formatTime(row.createdAt.split('T')[1].split('.')[0])}` },
    { header: 'Operator', accessor: (row: AuditLog) => row.user?.username || 'System' },
    {
      header: 'Action Done',
      accessor: (row: AuditLog) => (
        <span className="font-bold text-xs uppercase text-amber-700 dark:text-amber-500 tracking-wider">
          {row.action}
        </span>
      )
    },
    { header: 'Record Ref', accessor: (row: AuditLog) => row.recordId.slice(-6), className: 'font-mono' },
    {
      header: 'Modification Audit Details',
      accessor: (row: AuditLog) => {
        const det = row.details;
        if (!det) return '—';
        if (row.action === 'CREATE') {
          return `Created Opening Balance: ${formatCurrency(det.openingBalance)}`;
        }
        if (row.action === 'UPDATE') {
          return `Updated Closing Balance: ${formatCurrency(det.closingBalance)}`;
        }
        if (row.action === 'UPDATE_STATUS') {
          return `Verification status changed ${det.oldStatus} ➔ ${det.newStatus}. Remarks: "${det.remarks || 'None'}"`;
        }
        if (row.action === 'UPDATE_BALANCES') {
          return `Balances modified by owner. Opening: ${formatCurrency(det.previous.openingBalance)} ➔ ${formatCurrency(det.updated.openingBalance)}, Closing: ${det.previous.closingBalance !== null ? formatCurrency(det.previous.closingBalance) : 'N/A'} ➔ ${det.updated.closingBalance !== null ? formatCurrency(det.updated.closingBalance) : 'N/A'}`;
        }
        return JSON.stringify(det);
      }
    }
  ];

  // Calculate Admin Tally Stats
  const activeRecords = adminRecords.filter(r => r.closingBalance !== null);
  const totalOpening = activeRecords.reduce((s, r) => s + r.openingBalance, 0);
  const totalActual = activeRecords.reduce((s, r) => s + (r.closingBalance || 0), 0);
  const totalExpected = activeRecords.reduce((s, r) => s + r.expectedClosingBalance, 0);
  const netVariance = activeRecords.reduce((s, r) => s + (r.variance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-amber-700 dark:text-amber-500" />
          <span>Balance Reconciliation & Audit Desk</span>
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Verify staff opening/closing register entries, cross-reference ledger aggregates, and audit system adjustments.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Reconciliation Parameters
          </h3>
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Start Date</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">End Date</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Staff Member</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            >
              <option value="">All Staff</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            >
              <option value="">All Statuses</option>
              <option value="UNVERIFIED">UNVERIFIED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="FLAGGED">FLAGGED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Opening Cash"
          value={formatCurrency(totalOpening)}
          icon={<Coins className="w-5 h-5" />}
          color="amber"
        />
        <KPICard
          title="Total Expected Cash"
          value={formatCurrency(totalExpected)}
          icon={<Coins className="w-5 h-5" />}
          color="amber"
        />
        <KPICard
          title="Total Actual Cash"
          value={formatCurrency(totalActual)}
          icon={<Coins className="w-5 h-5" />}
          color="emerald"
        />
        <KPICard
          title="Tally Variance"
          value={formatCurrency(netVariance)}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={netVariance === 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'reconciliation'
                ? 'border-amber-700 text-amber-700 dark:border-amber-500 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Balance Reconciliation List
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'border-amber-700 text-amber-700 dark:border-amber-500 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Balance Audit Trails
          </button>
        </div>

        {activeTab === 'reconciliation' ? (
          <DataTable
            columns={reconciliationColumns}
            data={adminRecords}
            isLoading={loading}
            emptyMessage="No staff shift balance entries match your criteria."
          />
        ) : (
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            isLoading={loading}
            emptyMessage="No shift balance logs recorded."
          />
        )}
      </div>

      {/* Verification Modal (Approve or Flag) */}
      <Modal
        isOpen={actionType === 'verify' && !!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={actionStatus === 'APPROVED' ? 'Approve Balance Record' : 'Flag Balance Record'}
      >
        {selectedRecord && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Submit verification details for shift balance logged by <span className="font-semibold text-stone-800 dark:text-stone-200">{selectedRecord.user?.username}</span> on <span className="font-semibold text-stone-800 dark:text-stone-200">{formatDate(selectedRecord.date)}</span>.
            </p>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Opening Balance:</span>
                <span className="font-semibold font-mono text-stone-800 dark:text-stone-200">{formatCurrency(selectedRecord.openingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Actual Closing Balance:</span>
                <span className="font-semibold font-mono text-stone-800 dark:text-stone-200">{selectedRecord.closingBalance !== null ? formatCurrency(selectedRecord.closingBalance) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Expected Closing Balance:</span>
                <span className="font-semibold font-mono text-stone-800 dark:text-stone-200">{formatCurrency(selectedRecord.expectedClosingBalance)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 dark:border-stone-700 pt-2 font-bold">
                <span className="text-stone-500">Difference/Variance:</span>
                <span className={`font-mono ${selectedRecord.variance === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {selectedRecord.variance !== null ? formatCurrency(selectedRecord.variance) : '—'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Admin Remarks/Audit Notes (Optional for Approval, Recommended for Flagging)
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Enter remarks here..."
                rows={3}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSubmitting}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer shadow-sm ${
                  actionStatus === 'APPROVED'
                    ? 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800'
                    : 'bg-rose-700 hover:bg-rose-600 active:bg-rose-800'
                }`}
              >
                {actionSubmitting ? 'Saving...' : actionStatus === 'APPROVED' ? 'Approve Record' : 'Flag Record'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Admin Edit Modal */}
      <Modal
        isOpen={actionType === 'edit' && !!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Override Shift Balances"
      >
        {selectedRecord && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>WARNING: Overriding register values manually will write to audit trails.</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Opening Balance (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editOpening}
                onChange={(e) => setEditOpening(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Closing Balance (INR, Optional if shift is open)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editClosing}
                onChange={(e) => setEditClosing(e.target.value)}
                placeholder="Unclosed"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Override Reason (Mandatory Audit Entry)
              </label>
              <textarea
                required
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Explain why balances are being modified..."
                rows={3}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSubmitting || !adminRemarks.trim()}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {actionSubmitting ? 'Overriding...' : 'Save Manual Override'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
