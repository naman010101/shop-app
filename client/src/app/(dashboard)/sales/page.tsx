'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ExportButtons from '@/components/ExportButtons';
import { Plus, Edit2, Trash2, Calendar, User, Search, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SaleRecord {
  id: string;
  productName: string;
  amount: number;
  customerName: string;
  notes: string | null;
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

export default function SalesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // State for recording a new sale
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Records Table & Pagination State
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [usersList, setUsersList] = useState<StaffUser[]>([]);

  // Modals for Edit/Delete (Owner only)
  const [editRecord, setEditRecord] = useState<SaleRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<SaleRecord | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
      };
      const response = await api.get('/sales', { params });
      setRecords(response.data.records);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load sales records.');
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
  }, [page, startDate, endDate, filterUser, filterCustomer]);

  useEffect(() => {
    fetchUsers();
  }, [isOwner]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sales', {
        productName: productName.trim(),
        amount: parseFloat(amount),
        customerName: customerName.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success('Sale logged successfully!');
      // Reset form
      setProductName('');
      setAmount('');
      setCustomerName('');
      setNotes('');
      setPage(1);
      fetchRecords();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to record sale.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (rec: SaleRecord) => {
    setEditRecord(rec);
    setEditProductName(rec.productName);
    setEditAmount(rec.amount.toString());
    setEditCustomerName(rec.customerName);
    setEditNotes(rec.notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    setEditSubmitting(true);
    try {
      await api.put(`/sales/${editRecord.id}`, {
        productName: editProductName.trim(),
        amount: parseFloat(editAmount),
        customerName: editCustomerName.trim(),
        notes: editNotes.trim() || null,
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
      await api.delete(`/sales/${deleteRecord.id}`);
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
    setPage(1);
  };

  const columns = [
    { header: 'Date', accessor: (row: SaleRecord) => formatDate(row.date) },
    { header: 'Time', accessor: (row: SaleRecord) => formatTime(row.time) },
    { header: 'Person Name', accessor: 'productName' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Notes', accessor: (row: SaleRecord) => row.notes || '-' },
    { header: 'Recorded By', accessor: (row: SaleRecord) => row.user?.username || 'N/A' },
    {
      header: 'Amount',
      accessor: (row: SaleRecord) => (
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {formatCurrency(row.amount)}
        </span>
      ),
      className: 'text-right font-mono',
    },
    {
      header: 'Actions',
      accessor: (row: SaleRecord) => (
        <div className="flex justify-end gap-2">
          {isOwner ? (
            <>
              <button
                onClick={() => handleEditClick(row)}
                className="p-1 rounded bg-indigo-500/10 text-indigo-600 hover:bg-indigo-50 hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
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
            Sales Register Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log shop sales, billing transactions, and track product receipts.
          </p>
        </div>
        {isOwner && (
          <ExportButtons
            title="Sales Register Logs"
            dataType="sales"
            data={records}
            headers={['Date', 'Time', 'Person Name', 'Customer Name', 'Notes', 'Amount (INR)', 'Recorded By']}
            keys={['date', 'time', 'productName', 'customerName', 'notes', 'amount', 'user']}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-20">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              <span>Record Sale</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Person Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  placeholder="e.g. Suresh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Notes / Billing ID (Optional)
                </label>
                <textarea
                  placeholder="Enter billing notes, receipt IDs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
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
            emptyMessage="No sale records match your filters."
          />
        </div>
      </div>

      {/* Edit Modal (Owner Only) */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Sales Register Entry"
      >
        {editRecord && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Recorded by: {editRecord.user?.username} ({formatDate(editRecord.date)})</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Person Name
              </label>
              <input
                type="text"
                required
                value={editProductName}
                onChange={(e) => setEditProductName(e.target.value)}
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
                Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
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
              Are you sure you want to permanently delete this sales transaction record?
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div>
                <span className="font-semibold text-slate-500">Person Name:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200">{deleteRecord.productName}</span>
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
