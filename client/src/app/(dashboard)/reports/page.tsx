'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import ExportButtons from '@/components/ExportButtons';
import KPICard from '@/components/KPICard';
import {
  BarChart3,
  Calendar,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  FileSpreadsheet,
  FileText,
  Search,
  Lock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ReportSummary {
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  netBalance: number;
}

interface UserSummary {
  userId: string;
  username: string;
  role: string;
  totalInflow: number;
  totalSales: number;
  totalOutflow: number;
  netBalance: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // Filters State
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [usersList, setUsersList] = useState<{ id: string; username: string }[]>([]);

  // Report Data State
  const [summary, setSummary] = useState<ReportSummary>({ totalInflow: 0, totalSales: 0, totalOutflow: 0, netBalance: 0 });
  const [inflows, setInflows] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [outflows, setOutflows] = useState<any[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  
  // UI Tabs State
  const [activeTab, setActiveTab] = useState<'summary' | 'inflow' | 'sales' | 'outflow' | 'userwise'>('summary');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!isOwner) return;
    try {
      const response = await api.get('/users');
      setUsersList(response.data.users);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      // 1. Fetch range-based transactions report
      const params: any = {
        type: reportType !== 'custom' ? reportType : undefined,
        startDate: reportType === 'custom' && startDate ? startDate : undefined,
        endDate: reportType === 'custom' && endDate ? endDate : undefined,
        userId: filterUser || undefined,
      };

      const response = await api.get('/reports', { params });
      setSummary(response.data.summary);
      setInflows(response.data.inflows);
      setSales(response.data.sales);
      setOutflows(response.data.outflows);

      // 2. Fetch User-Wise report
      const userParams: any = {
        startDate: reportType === 'custom' && startDate ? startDate : undefined,
        endDate: reportType === 'custom' && endDate ? endDate : undefined,
      };
      if (reportType === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        userParams.startDate = today;
        userParams.endDate = today;
      }
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
  }, [reportType, startDate, endDate, filterUser, isOwner]);

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full">
          <Lock className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Access Denied</h1>
        <p className="text-sm text-slate-500 max-w-sm">
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
  ].sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  const allColumns = [
    { header: 'Date/Time', accessor: (row: any) => `${formatDate(row.date)} ${formatTime(row.time)}` },
    {
      header: 'Type',
      accessor: (row: any) => {
        const styles: any = {
          inflow: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          sales: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
          outflow: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${styles[row.type]}`}>{row.type.toUpperCase()}</span>;
      }
    },
    {
      header: 'Details',
      accessor: (row: any) => {
        if (row.type === 'inflow') return `Customer: ${row.customerName} (Slip: ${row.slipNumber})`;
        if (row.type === 'sales') return `Product: ${row.productName} (Customer: ${row.customerName})`;
        return `Reason: ${row.reason}`;
      }
    },
    { header: 'Recorded By', accessor: (row: any) => row.user?.username || 'N/A' },
    {
      header: 'Amount',
      accessor: (row: any) => {
        const sign = row.type === 'outflow' ? '-' : '+';
        const style = row.type === 'outflow' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
        return <span className={`font-semibold ${style}`}>{sign} {formatCurrency(row.amount)}</span>;
      },
      className: 'text-right font-mono'
    }
  ];

  const userColumns = [
    { header: 'Staff Username', accessor: 'username' },
    { header: 'Account Role', accessor: (row: UserSummary) => row.role },
    {
      header: 'Total Cash Inflow',
      accessor: (row: UserSummary) => formatCurrency(row.totalInflow),
      className: 'font-mono'
    },
    {
      header: 'Total Sales logged',
      accessor: (row: UserSummary) => formatCurrency(row.totalSales),
      className: 'font-mono'
    },
    {
      header: 'Total Cash Outflow',
      accessor: (row: UserSummary) => formatCurrency(row.totalOutflow),
      className: 'font-mono'
    },
    {
      header: 'Net Ledger Balance',
      accessor: (row: UserSummary) => {
        const style = row.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold';
        return <span className={style}>{formatCurrency(row.netBalance)}</span>;
      },
      className: 'text-right font-mono'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            <span>Reports & Audit Desk</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate ledger summaries, evaluate staff registers, and export transaction audit trails.
          </p>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {(['daily', 'weekly', 'monthly', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  reportType === t
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export presets (Only visible when table contains data) */}
          <div className="flex items-center gap-2">
            {activeTab === 'summary' && (
              <ExportButtons
                title="All Transactions Report"
                dataType="reports"
                data={allTransactions}
                headers={['Date/Time', 'Type', 'Amount (INR)', 'Recorded By']}
                keys={['date', 'type', 'amount', 'user']}
              />
            )}
            {activeTab === 'inflow' && (
              <ExportButtons
                title="Cash Inflow Audit Logs"
                dataType="inflow"
                data={inflows}
                headers={['Date', 'Time', 'Slip Number', 'Customer Name', 'Remarks', 'Amount (INR)', 'Recorded By']}
                keys={['date', 'time', 'slipNumber', 'customerName', 'remarks', 'amount', 'user']}
              />
            )}
            {activeTab === 'sales' && (
              <ExportButtons
                title="Sales Audit Logs"
                dataType="sales"
                data={sales}
                headers={['Date', 'Time', 'Product/Service', 'Customer Name', 'Notes', 'Amount (INR)', 'Recorded By']}
                keys={['date', 'time', 'productName', 'customerName', 'notes', 'amount', 'user']}
              />
            )}
            {activeTab === 'outflow' && (
              <ExportButtons
                title="Cash Outflow Audit Logs"
                dataType="outflow"
                data={outflows}
                headers={['Date', 'Time', 'Reason', 'Notes', 'Amount (INR)', 'Recorded By']}
                keys={['date', 'time', 'reason', 'notes', 'amount', 'user']}
              />
            )}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {reportType === 'custom' && (
            <>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-indigo-500 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-indigo-500 dark:bg-slate-900"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Filter Staff User</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-indigo-500 dark:bg-slate-900"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      ) : (
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
            color="indigo"
          />
          <KPICard
            title="Total Cash Outflow"
            value={formatCurrency(summary.totalOutflow)}
            icon={<ArrowUpRight className="w-6 h-6" />}
            color="rose"
          />
          <KPICard
            title="Net Ledger Balance"
            value={formatCurrency(summary.netBalance)}
            icon={<Wallet className="w-6 h-6" />}
            color={summary.netBalance >= 0 ? 'amber' : 'rose'}
          />
        </div>
      )}

      {/* Detail Tables Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'summary', name: 'All Transactions' },
            { id: 'inflow', name: 'Inflow Records' },
            { id: 'sales', name: 'Sales Records' },
            { id: 'outflow', name: 'Outflow Records' },
            { id: 'userwise', name: 'Staff User Summary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
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
              { header: 'Customer', accessor: 'customerName' },
              { header: 'Remarks', accessor: (row) => row.remarks || '-' },
              { header: 'Recorded By', accessor: (row) => row.user?.username || 'N/A' },
              {
                header: 'Amount',
                accessor: (row) => <span className="font-semibold text-emerald-600">{formatCurrency(row.amount)}</span>,
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
              { header: 'Product/Service', accessor: 'productName' },
              { header: 'Customer', accessor: 'customerName' },
              { header: 'Notes', accessor: (row) => row.notes || '-' },
              { header: 'Recorded By', accessor: (row) => row.user?.username || 'N/A' },
              {
                header: 'Amount',
                accessor: (row) => <span className="font-semibold text-indigo-600">{formatCurrency(row.amount)}</span>,
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
                accessor: (row) => <span className="font-semibold text-rose-600">{formatCurrency(row.amount)}</span>,
                className: 'text-right font-mono'
              }
            ]}
            data={outflows}
            isLoading={loading}
            emptyMessage="No cash outflows recorded."
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
