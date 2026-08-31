'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import KPICard from '@/components/KPICard';
import {
  BarChart3,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Lock,
  FileText,
  Scale,
  Coins,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ReportSummary {
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  openingBalance: number;
  closingBalance: number;
  netCashMovement: number;
  netBalance: number;
}

interface UserSummary {
  userId: string;
  username: string;
  role: string;
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  openingBalance: number;
  netBalance: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // Filters State
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [usersList, setUsersList] = useState<{ id: string; username: string }[]>([]);

  // Report Data State
  const [summary, setSummary] = useState<ReportSummary>({
    totalInflow: 0, totalSales: 0, totalOutflow: 0,
    openingBalance: 0, closingBalance: 0, netCashMovement: 0, netBalance: 0
  });
  const [reportRange, setReportRange] = useState<{ start: string; end: string } | null>(null);
  const [inflows, setInflows] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [outflows, setOutflows] = useState<any[]>([]);
  const [balanceRecords, setBalanceRecords] = useState<any[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);

  // UI Tabs State
  const [activeTab, setActiveTab] = useState<'summary' | 'inflow' | 'sales' | 'outflow' | 'balance' | 'userwise'>('summary');
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchUsers = async () => {
    if (!isOwner) return;
    try {
      const response = await api.get('/users');
      setUsersList(response.data.users);
    } catch (error) {
      console.error(error);
    }
  };

  const buildParams = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (reportType === 'custom') {
      return {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: filterUser || undefined,
      };
    }
    return {
      type: reportType,
      date: selectedDate || today,
      userId: filterUser || undefined,
    };
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const response = await api.get('/reports', { params });
      setSummary(response.data.summary);
      setReportRange(response.data.range);
      setInflows(response.data.inflows);
      setSales(response.data.sales);
      setOutflows(response.data.outflows);
      setBalanceRecords(response.data.balanceRecords || []);

      // User-wise report with same date range
      const userParams: any = {};
      if (reportType === 'custom') {
        userParams.startDate = startDate || undefined;
        userParams.endDate = endDate || undefined;
      } else {
        const rangeData = response.data.range;
        if (rangeData) {
          userParams.startDate = rangeData.start;
          userParams.endDate = rangeData.end;
        }
      }
      if (filterUser) userParams.userId = filterUser;
      const userRes = await api.get('/reports/user-wise', { params: userParams });
      setUserSummaries(userRes.data.report);

    } catch (error) {
      toast.error('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isOwner]);

  useEffect(() => {
    if (isOwner) {
      fetchReport();
    }
  }, [reportType, selectedDate, startDate, endDate, filterUser, isOwner]);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params = buildParams();
      const response = await api.get('/reports/export/pdf', {
        params,
        responseType: 'blob',
      });

      if (response.data.type && response.data.type.includes('application/json')) {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Server returned an error');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const range = reportRange;
      link.setAttribute('download', `cash_report_${range?.start || 'report'}_to_${range?.end || 'report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully!');
    } catch (err: any) {
      const message = err?.message || 'Failed to export PDF.';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || message);
          return;
        } catch {
          // Fall back
        }
      }
      toast.error(message);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = buildParams();
      const response = await api.get('/reports/export/excel', {
        params,
        responseType: 'blob',
      });

      if (response.data.type && response.data.type.includes('application/json')) {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Server returned an error');
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const range = reportRange;
      link.setAttribute('download', `cash_report_${range?.start || 'report'}_to_${range?.end || 'report'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exported successfully!');
    } catch (err: any) {
      const message = err?.message || 'Failed to export Excel.';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.error || message);
          return;
        } catch {
          // Fall back
        }
      }
      toast.error(message);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-full">
          <Lock className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50">Access Denied</h1>
        <p className="text-sm text-stone-500 max-w-sm">
          Only the Shop Owner (Admin) can view reports and dashboards. Please contact the administrator.
        </p>
      </div>
    );
  }

  // Combined records list for summary page
  const allTransactions = [
    ...inflows.map(r => ({ ...r, type: 'inflow' })),
    ...sales.map(r => ({ ...r, type: 'sales' })),
    ...outflows.map(r => ({ ...r, type: 'outflow' }))
  ].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  const allColumns = [
    { header: 'Date', accessor: (row: any) => formatDate(row.date) },
    { header: 'Time', accessor: (row: any) => formatTime(row.time) },
    {
      header: 'Type',
      accessor: (row: any) => {
        const styles: any = {
          inflow: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          sales: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
          outflow: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${styles[row.type]}`}>{row.type.toUpperCase()}</span>;
      }
    },
    {
      header: 'Details',
      accessor: (row: any) => {
        if (row.type === 'inflow') return `Customer: ${row.customerName || '—'} (Slip: ${row.slipNumber || '—'})`;
        if (row.type === 'sales') return `Person: ${row.productName || '—'} (Customer: ${row.customerName || '—'})`;
        return `Reason: ${row.reason || '—'}`;
      }
    },
    { header: 'Staff', accessor: (row: any) => row.user?.username || 'N/A' },
    {
      header: 'Amount',
      accessor: (row: any) => {
        const sign = row.type === 'outflow' ? '-' : '+';
        const style = row.type === 'outflow' ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400';
        return <span className={`font-semibold ${style}`}>{sign} {formatCurrency(row.amount)}</span>;
      },
      className: 'text-right font-mono'
    }
  ];

  const userColumns = [
    { header: 'Staff Username', accessor: 'username' },
    { header: 'Role', accessor: (row: UserSummary) => row.role },
    { header: 'Opening Balance', accessor: (row: UserSummary) => formatCurrency(row.openingBalance), className: 'font-mono' },
    { header: 'Cash Inflow', accessor: (row: UserSummary) => formatCurrency(row.totalInflow), className: 'font-mono' },
    { header: 'Sales', accessor: (row: UserSummary) => formatCurrency(row.totalSales), className: 'font-mono' },
    { header: 'Cash Outflow', accessor: (row: UserSummary) => formatCurrency(row.totalOutflow), className: 'font-mono' },
    {
      header: 'Net Cash',
      accessor: (row: UserSummary) => {
        const style = row.netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-rose-700 dark:text-rose-400 font-semibold';
        return <span className={style}>{formatCurrency(row.netBalance)}</span>;
      },
      className: 'text-right font-mono'
    }
  ];

  const balanceColumns = [
    { header: 'Date', accessor: (row: any) => formatDate(row.date) },
    { header: 'Staff', accessor: (row: any) => row.user?.username || '—' },
    { header: 'Opening Balance', accessor: (row: any) => formatCurrency(row.openingBalance), className: 'font-mono' },
    { header: 'Opening Time', accessor: (row: any) => formatTime(row.openingTime) },
    { header: 'Closing Balance', accessor: (row: any) => row.closingBalance !== null ? formatCurrency(row.closingBalance) : '—', className: 'font-mono' },
    { header: 'Closing Time', accessor: (row: any) => row.closingTime ? formatTime(row.closingTime) : '—' },
    {
      header: 'Status',
      accessor: (row: any) => {
        const styles: any = {
          APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          FLAGGED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
          UNVERIFIED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${styles[row.status] || ''}`}>{row.status}</span>;
      }
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-700 dark:text-amber-500" />
            <span>Reports &amp; Audit Desk</span>
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Generate ledger summaries, evaluate staff registers, and export transaction audit trails.
          </p>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
            {(['daily', 'weekly', 'monthly', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  reportType === t
                    ? 'bg-stone-950 text-white shadow-sm dark:bg-amber-700'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Export Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all cursor-pointer disabled:opacity-60"
            >
              <FileText className="w-3.5 h-3.5" />
              {exportingPdf ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Date Range Label */}
        {reportRange && !loading && (
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Showing data for: <span className="font-semibold text-stone-700 dark:text-stone-300">{formatDate(reportRange.start)}</span>
              {reportRange.start !== reportRange.end && (
                <> — <span className="font-semibold text-stone-700 dark:text-stone-300">{formatDate(reportRange.end)}</span></>
              )}
            </span>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {reportType !== 'custom' && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Reference Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-700 focus:ring-1 focus:ring-amber-700 dark:bg-stone-900 dark:focus:border-amber-500"
              />
            </div>
          )}

          {reportType === 'custom' && (
            <>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-700 focus:ring-1 focus:ring-amber-700 dark:bg-stone-900 dark:focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-700 focus:ring-1 focus:ring-amber-700 dark:bg-stone-900 dark:focus:border-amber-500"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Filter Staff User</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-700 focus:ring-1 focus:ring-amber-700 dark:bg-stone-900 dark:focus:border-amber-500"
            >
              <option value="">All Staff</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI summaries */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-stone-200 dark:bg-stone-800 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Row 1: Transaction totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total Cash Inflow"
              value={formatCurrency(summary.totalInflow)}
              icon={<ArrowDownLeft className="w-6 h-6" />}
              color="emerald"
            />
            <KPICard
              title="Total Sales Value"
              value={formatCurrency(summary.totalSales)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="amber"
            />
            <KPICard
              title="Total Cash Outflow"
              value={formatCurrency(summary.totalOutflow)}
              icon={<ArrowUpRight className="w-6 h-6" />}
              color="rose"
            />
            <KPICard
              title="Net Cash Movement"
              value={formatCurrency(summary.netCashMovement)}
              icon={<Wallet className="w-6 h-6" />}
              color={summary.netCashMovement >= 0 ? 'emerald' : 'rose'}
              description="Opening + Inflow + Sales − Outflow"
            />
          </div>

          {/* Row 2: Balance totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <KPICard
              title="Opening Balance (Period)"
              value={formatCurrency(summary.openingBalance)}
              icon={<Coins className="w-6 h-6" />}
              color="amber"
              description="Sum of all opening balances in range"
            />
            <KPICard
              title="Closing Balance (Period)"
              value={formatCurrency(summary.closingBalance)}
              icon={<Scale className="w-6 h-6" />}
              color="amber"
              description="Sum of all submitted closing balances"
            />
          </div>
        </div>
      )}

      {/* Detail Tables Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-stone-200 dark:border-stone-800 overflow-x-auto gap-2">
          {[
            { id: 'summary',  name: 'All Transactions' },
            { id: 'inflow',   name: 'Inflow Records' },
            { id: 'sales',    name: 'Sales Records' },
            { id: 'outflow',  name: 'Outflow Records' },
            { id: 'balance',  name: 'Balance Records' },
            { id: 'userwise', name: 'Staff Summary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-amber-700 text-amber-700 dark:text-amber-400 dark:border-amber-500'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === 'summary' && (
          <DataTable
            columns={allColumns}
            data={allTransactions}
            isLoading={loading}
            emptyMessage="No transactions matching your criteria."
          />
        )}
        {activeTab === 'inflow' && (
          <DataTable
            columns={[
              { header: 'Date', accessor: (row) => formatDate(row.date) },
              { header: 'Time', accessor: (row) => formatTime(row.time) },
              { header: 'Slip Number', accessor: 'slipNumber' },
              { header: 'Customer/Product', accessor: 'customerName' },
              { header: 'Remarks', accessor: (row) => row.remarks || '-' },
              { header: 'Recorded By', accessor: (row) => row.user?.username || 'N/A' },
              {
                header: 'Amount',
                accessor: (row) => <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">{formatCurrency(row.amount)}</span>,
                className: 'text-right font-mono'
              }
            ]}
            data={inflows}
            isLoading={loading}
            emptyMessage="No cash inflows recorded."
          />
        )}
        {activeTab === 'sales' && (
          <DataTable
            columns={[
              { header: 'Date', accessor: (row) => formatDate(row.date) },
              { header: 'Time', accessor: (row) => formatTime(row.time) },
              { header: 'Person Name', accessor: 'productName' },
              { header: 'Customer', accessor: 'customerName' },
              { header: 'Notes', accessor: (row) => row.notes || '-' },
              { header: 'Recorded By', accessor: (row) => row.user?.username || 'N/A' },
              {
                header: 'Amount',
                accessor: (row) => <span className="font-semibold text-amber-700 dark:text-amber-400 font-mono">{formatCurrency(row.amount)}</span>,
                className: 'text-right font-mono'
              }
            ]}
            data={sales}
            isLoading={loading}
            emptyMessage="No sales recorded."
          />
        )}
        {activeTab === 'outflow' && (
          <DataTable
            columns={[
              { header: 'Date', accessor: (row) => formatDate(row.date) },
              { header: 'Time', accessor: (row) => formatTime(row.time) },
              { header: 'Reason', accessor: 'reason' },
              { header: 'Notes', accessor: (row) => row.notes || '-' },
              { header: 'Recorded By', accessor: (row) => row.user?.username || 'N/A' },
              {
                header: 'Amount',
                accessor: (row) => <span className="font-semibold text-rose-700 dark:text-rose-400 font-mono">{formatCurrency(row.amount)}</span>,
                className: 'text-right font-mono'
              }
            ]}
            data={outflows}
            isLoading={loading}
            emptyMessage="No cash outflows recorded."
          />
        )}
        {activeTab === 'balance' && (
          <DataTable
            columns={balanceColumns}
            data={balanceRecords}
            isLoading={loading}
            emptyMessage="No balance records in this period."
          />
        )}
        {activeTab === 'userwise' && (
          <DataTable
            columns={userColumns}
            data={userSummaries}
            isLoading={loading}
            emptyMessage="No user statistics available."
          />
        )}
      </div>
    </div>
  );
}
