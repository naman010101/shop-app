'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ExportButtons from '@/components/ExportButtons';
import { Plus, Edit2, Trash2, Calendar, User, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface InflowRecord {
  id: string;
  amount: number;
  slipNumber: string;
  customerName: string;
  remarks: string | null;
  date: string;
  time: string;
  userId: string;
  user: {
    username: string;
  };
}

interface StaffUser {
  id: string;
  username: string;
}

export default function InflowPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // State for recording a new inflow
  const [amount, setAmount] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [slipExists, setSlipExists] = useState(false);
  const [checkingSlip, setCheckingSlip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Records Table & Pagination State
  const [records, setRecords] = useState<InflowRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSlip, setFilterSlip] = useState('');
  const [usersList, setUsersList] = useState<StaffUser[]>([]);

  // Modals for Edit/Delete (Owner only)
  const [editRecord, setEditRecord] = useState<InflowRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<InflowRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSlipNumber, setEditSlipNumber] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Debouncing slip number check
  const slipCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: filterUser || undefined,
        customerName: filterCustomer || undefined,
        slipNumber: filterSlip || undefined,
      };
      const response = await api.get('/inflow', { params });
      setRecords(response.data.records);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load inflow records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!isOwner) return;
    try {
      const response = await api.get('/users');
      setUsersList(response.data.users);
    } catch (error) {
      console.error('Failed to load users for filter list.');
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, startDate, endDate, filterUser, filterCustomer, filterSlip]);

  useEffect(() => {
    fetchUsers();
  }, [isOwner]);

  // Check duplicate slip number
  useEffect(() => {
    if (!slipNumber.trim()) {
      setSlipExists(false);
      return;
    }

    if (slipCheckTimeoutRef.current) {
      clearTimeout(slipCheckTimeoutRef.current);
    }

    setCheckingSlip(true);
    slipCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/inflow/check-slip?slipNumber=${slipNumber.trim()}`);
        setSlipExists(response.data.exists);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingSlip(false);
      }
    }, 500);

    return () => {
      if (slipCheckTimeoutRef.current) clearTimeout(slipCheckTimeoutRef.current);
    };
  }, [slipNumber]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slipExists) {
      toast.error('Slip number already exists!');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inflow', {
        amount: parseFloat(amount),
        slipNumber: slipNumber.trim(),
        customerName: customerName.trim(),
        remarks: remarks.trim() || undefined,
      });
      toast.success('Inflow recorded successfully!');
      // Reset form
      setAmount('');
      setSlipNumber('');
      setCustomerName('');
      setRemarks('');
      setPage(1);
      fetchRecords();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to submit inflow.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (rec: InflowRecord) => {
    setEditRecord(rec);
    setEditAmount(rec.amount.toString());
    setEditSlipNumber(rec.slipNumber);
    setEditCustomerName(rec.customerName);
    setEditRemarks(rec.remarks || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    setEditSubmitting(true);
    try {
      await api.put(`/inflow/${editRecord.id}`, {
        amount: parseFloat(editAmount),
        slipNumber: editSlipNumber.trim(),
        customerName: editCustomerName.trim(),
        remarks: editRemarks.trim() || null,
      });
      toast.success('Record updated successfully!');
      setEditRecord(null);
      fetchRecords();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update record.';
      toast.error(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/inflow/${deleteRecord.id}`);
      toast.success('Record deleted successfully!');
      setDeleteRecord(null);
      fetchRecords();
    } catch (error: any) {
      toast.error('Failed to delete record.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterUser('');
    setFilterCustomer('');
    setFilterSlip('');
    setPage(1);
  };

  const columns = [
    { header: 'Date', accessor: (row: InflowRecord) => formatDate(row.date) },
    { header: 'Time', accessor: (row: InflowRecord) => formatTime(row.time) },
    { header: 'Slip Number', accessor: 'slipNumber' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Remarks', accessor: (row: InflowRecord) => row.remarks || '-' },
    { header: 'Recorded By', accessor: (row: InflowRecord) => row.user?.username || 'N/A' },
    {
      header: 'Amount',
      accessor: (row: InflowRecord) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.amount)}
        </span>
      ),
      className: 'text-right font-mono',
    },
    {
      header: 'Actions',
      accessor: (row: InflowRecord) => (
        <div className="flex justify-end gap-2">
          {isOwner ? (
            <>
              <button
                onClick={() => handleEditClick(row)}
                className="p-1 rounded bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500 hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteRecord(row)}
                className="p-1 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-50 hover:text-white dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 cursor-not-allowed italic" title="Staff accounts cannot edit entries.">
              Submitted
            </span>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Cash Inflow Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log deposit slips, customer payments, and track in-hand cash receipts.
          </p>
        </div>
        {isOwner && (
          <ExportButtons
            title="Cash Inflow Logs"
            dataType="inflow"
            data={records}
            headers={['Date', 'Time', 'Slip Number', 'Customer Name', 'Remarks', 'Amount (INR)', 'Recorded By']}
            keys={['date', 'time', 'slipNumber', 'customerName', 'remarks', 'amount', 'user']}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-20">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              <span>Record Cash Inflow</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Slip Number (Unique)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. SLIP-10023"
                    value={slipNumber}
                    onChange={(e) => setSlipNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {checkingSlip && (
                    <span className="absolute right-3.5 top-3">
                      <RefreshCw className="w-4.5 h-4.5 animate-spin text-slate-400" />
                    </span>
                  )}
                </div>
                {slipExists && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>This slip number is already taken.</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="₹0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Remarks (Optional)
                </label>
                <textarea
                  placeholder="Enter any additional notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || slipExists || checkingSlip}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <span>Submit Entry</span>
              </button>
            </form>
          </div>
        </div>

        {/* Filters and Ledgers list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Filters & Search
              </h3>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Slip Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Slip Number</span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search slip..."
                    value={filterSlip}
                    onChange={(e) => { setFilterSlip(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 pl-8 pr-3 text-xs outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Customer Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={filterCustomer}
                    onChange={(e) => { setFilterCustomer(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 pl-8 pr-3 text-xs outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Staff filter (Owner only) */}
              {isOwner && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Staff User</span>
                  <select
                    value={filterUser}
                    onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-indigo-500 dark:bg-slate-900"
                  >
                    <option value="">All Staff</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Filters */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-indigo-500 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-indigo-500 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <DataTable
            columns={columns}
            data={records}
            isLoading={loading}
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={setPage}
            emptyMessage="No cash inflow records match your filters."
          />
        </div>
      </div>

      {/* Edit Modal (Owner Only) */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Cash Inflow Entry"
      >
        {editRecord && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Recorded by: {editRecord.user?.username} ({formatDate(editRecord.date)})</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Slip Number
              </label>
              <input
                type="text"
                required
                value={editSlipNumber}
                onChange={(e) => setEditSlipNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Amount (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Customer Name
              </label>
              <input
                type="text"
                required
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Remarks
              </label>
              <textarea
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditRecord(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal (Owner Only) */}
      <Modal
        isOpen={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        title="Confirm Deletion"
      >
        {deleteRecord && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete this cash inflow record?
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div>
                <span className="font-semibold text-slate-500">Slip Number:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200 font-mono">{deleteRecord.slipNumber}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Customer:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200">{deleteRecord.customerName}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Amount:</span>{' '}
                <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(deleteRecord.amount)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRecord(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
