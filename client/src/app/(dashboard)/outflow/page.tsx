'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ExportButtons from '@/components/ExportButtons';
import { Plus, Edit2, Trash2, Calendar, User, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OutflowRecord {
  id: string;
  amount: number;
  reason: string;
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

export default function OutflowPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // State for recording a new outflow
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Records Table & Pagination State
  const [records, setRecords] = useState<OutflowRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [usersList, setUsersList] = useState<StaffUser[]>([]);

  // Modals for Edit/Delete (Owner only)
  const [editRecord, setEditRecord] = useState<OutflowRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<OutflowRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');
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
      };
      const response = await api.get('/outflow', { params });
      setRecords(response.data.records);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load outflow records.');
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
  }, [page, startDate, endDate, filterUser]);

  useEffect(() => {
    fetchUsers();
  }, [isOwner]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/outflow', {
        amount: parseFloat(amount),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success('Cash outflow logged successfully!');
      // Reset form
      setAmount('');
      setReason('');
      setNotes('');
      setPage(1);
      fetchRecords();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to record outflow.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (rec: OutflowRecord) => {
    setEditRecord(rec);
    setEditAmount(rec.amount.toString());
    setEditReason(rec.reason);
    setEditNotes(rec.notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    setEditSubmitting(true);
    try {
      await api.put(`/outflow/${editRecord.id}`, {
        amount: parseFloat(editAmount),
        reason: editReason.trim(),
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
      await api.delete(`/outflow/${deleteRecord.id}`);
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
    setPage(1);
  };

  const columns = [
    { header: 'Date', accessor: (row: OutflowRecord) => formatDate(row.date) },
    { header: 'Time', accessor: (row: OutflowRecord) => formatTime(row.time) },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Notes', accessor: (row: OutflowRecord) => row.notes || '-' },
    { header: 'Recorded By', accessor: (row: OutflowRecord) => row.user?.username || 'N/A' },
    {
      header: 'Amount',
      accessor: (row: OutflowRecord) => (
        <span className="font-semibold text-rose-700 dark:text-rose-400">
          {formatCurrency(row.amount)}
        </span>
      ),
      className: 'text-right font-mono',
    },
    {
      header: 'Actions',
      accessor: (row: OutflowRecord) => (
        <div className="flex justify-end gap-2">
          {isOwner ? (
            <>
              <button
                onClick={() => handleEditClick(row)}
                className="p-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-700 hover:text-white dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-600 transition-colors cursor-pointer"
                title="Edit entry"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteRecord(row)}
                className="p-1 rounded-lg bg-rose-500/10 text-rose-700 hover:bg-rose-700 hover:text-white dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-600 transition-colors cursor-pointer"
                title="Delete entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="text-xs text-stone-400 cursor-not-allowed italic" title="Staff accounts cannot edit entries.">
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
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight">
            Cash Outflow Ledger
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Log till withdrawals, shop expenses, vendor payouts, and track cash register outflows.
          </p>
        </div>
        {isOwner && (
          <ExportButtons
            title="Cash Outflow Logs"
            dataType="outflow"
            data={records}
            headers={['Date', 'Time', 'Reason', 'Notes', 'Amount (INR)', 'Recorded By']}
            keys={['date', 'time', 'reason', 'notes', 'amount', 'user']}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm sticky top-20">
            <h2 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-50 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-700 dark:text-amber-500" />
              <span>Record Cash Outflow</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Reason for Outflow
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tea & Refreshment Expenses"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
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
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Additional Notes (Optional)
                </label>
                <textarea
                  placeholder="Enter vendor details, itemizations, description..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden transition-all focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-amber-700 hover:bg-amber-600 active:bg-amber-800 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                <span>Submit Entry</span>
              </button>
            </form>
          </div>
        </div>

        {/* Filters and Ledgers list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                Filters & Search
              </h3>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Staff filter (Owner only) */}
              {isOwner && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Staff User</span>
                  <select
                    value={filterUser}
                    onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
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
                <span className="text-[10px] font-bold text-stone-400 uppercase">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
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
            emptyMessage="No cash outflow records match your filters."
          />
        </div>
      </div>

      {/* Edit Modal (Owner Only) */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Cash Outflow Entry"
      >
        {editRecord && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-stone-400">Recorded by: {editRecord.user?.username} ({formatDate(editRecord.date)})</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Reason for Outflow
              </label>
              <input
                type="text"
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Amount (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Additional Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditRecord(null)}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-sm"
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
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Are you sure you want to permanently delete this cash outflow record?
            </p>
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-2">
              <div>
                <span className="font-semibold text-stone-500">Reason:</span>{' '}
                <span className="text-stone-800 dark:text-stone-200">{deleteRecord.reason}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-500">Amount:</span>{' '}
                <span className="font-semibold text-rose-700 dark:text-rose-400 font-mono">{formatCurrency(deleteRecord.amount)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRecord(null)}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-sm"
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
