'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ExportButtons from '@/components/ExportButtons';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PartyDispatchRecord {
  id: string;
  bill_number: string;
  challan_number: string;
  party_name: string;
  item_name: string;
  quantity: number;
  slip_number: string;
  by_person: string;
  created_at: string;
  userId: string;
  user: { username: string };
}

export default function PartyDispatchPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  // ── Records state ───────────────────────────────────────────────────────────
  const [records, setRecords] = useState<PartyDispatchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterBill, setFilterBill] = useState('');
  const [filterSlip, setFilterSlip] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [usersList, setUsersList] = useState<{ id: string; username: string }[]>([]);

  // ── Activity Logs state (Owner only) ────────────────────────────────────────
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  // ── Create form state ────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [partyName, setPartyName] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [byPerson, setByPerson] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Edit/Delete state (Owner only) ─────────────────────────────────────────
  const [editRecord, setEditRecord] = useState<PartyDispatchRecord | null>(null);
  const [editBillNumber, setEditBillNumber] = useState('');
  const [editChallanNumber, setEditChallanNumber] = useState('');
  const [editPartyName, setEditPartyName] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editSlipNumber, setEditSlipNumber] = useState('');
  const [editByPerson, setEditByPerson] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteRecord, setDeleteRecord] = useState<PartyDispatchRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        partyName: filterParty || undefined,
        itemName: filterItem || undefined,
        billNumber: filterBill || undefined,
        slipNumber: filterSlip || undefined,
        userId: filterUser || undefined,
      };
      const response = await api.get('/warehouse/party-dispatch', { params });
      setRecords(response.data.records);
      setTotal(response.data.total);
    } catch {
      toast.error('Failed to load party dispatch records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!isOwner) return;
    try {
      const response = await api.get('/users');
      setUsersList(response.data.users);
    } catch {
      console.error('Failed to load users for filter.');
    }
  };

  const fetchLogs = async () => {
    if (!isOwner) return;
    setLogsLoading(true);
    try {
      const response = await api.get('/warehouse/activity-logs', {
        params: { page: logsPage, limit: 10 }
      });
      setLogs(response.data.logs);
      setLogsTotal(response.data.total);
    } catch {
      toast.error('Failed to load activity logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, startDate, endDate, filterParty, filterItem, filterBill, filterSlip, filterUser]);

  useEffect(() => {
    fetchUsers();
  }, [isOwner]);

  useEffect(() => {
    if (logsOpen) {
      fetchLogs();
    }
  }, [logsOpen, logsPage]);

  const resetCreateForm = () => {
    setBillNumber(''); setChallanNumber(''); setPartyName('');
    setItemName(''); setQuantity(''); setSlipNumber(''); setByPerson('');
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/warehouse/party-dispatch', {
        bill_number: billNumber.trim(),
        challan_number: challanNumber.trim(),
        party_name: partyName.trim(),
        item_name: itemName.trim(),
        quantity: parseInt(quantity),
        slip_number: slipNumber.trim(),
        by_person: byPerson.trim(),
      });
      toast.success('Party dispatch recorded successfully!');
      resetCreateForm();
      setCreateOpen(false);
      setPage(1);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (rec: PartyDispatchRecord) => {
    setEditRecord(rec);
    setEditBillNumber(rec.bill_number);
    setEditChallanNumber(rec.challan_number);
    setEditPartyName(rec.party_name);
    setEditItemName(rec.item_name);
    setEditQuantity(String(rec.quantity));
    setEditSlipNumber(rec.slip_number);
    setEditByPerson(rec.by_person);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    setEditSubmitting(true);
    try {
      await api.put(`/warehouse/party-dispatch/${editRecord.id}`, {
        bill_number: editBillNumber.trim(),
        challan_number: editChallanNumber.trim(),
        party_name: editPartyName.trim(),
        item_name: editItemName.trim(),
        quantity: parseInt(editQuantity),
        slip_number: editSlipNumber.trim(),
        by_person: editByPerson.trim(),
      });
      toast.success('Record updated successfully!');
      setEditRecord(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update record.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/warehouse/party-dispatch/${deleteRecord.id}`);
      toast.success('Record deleted successfully!');
      setDeleteRecord(null);
      fetchRecords();
    } catch {
      toast.error('Failed to delete record.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const clearFilters = () => {
    setStartDate(''); setEndDate('');
    setFilterParty(''); setFilterItem('');
    setFilterBill(''); setFilterSlip('');
    setFilterUser('');
    setPage(1);
  };

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = [
    { header: 'Date', accessor: (r: PartyDispatchRecord) => formatDate(r.created_at.split('T')[0]) },
    { header: 'Bill #', accessor: 'bill_number' as const, className: 'font-mono' },
    { header: 'Challan #', accessor: 'challan_number' as const, className: 'font-mono' },
    { header: 'Party Name', accessor: 'party_name' as const },
    { header: 'Item / Product', accessor: 'item_name' as const },
    { header: 'Qty', accessor: (r: PartyDispatchRecord) => <span className="font-semibold text-amber-700 dark:text-amber-400 font-mono">{r.quantity}</span> },
    { header: 'Slip #', accessor: 'slip_number' as const, className: 'font-mono' },
    { header: 'By Person', accessor: 'by_person' as const },
    { header: 'Recorded By', accessor: (r: PartyDispatchRecord) => r.user?.username || 'N/A' },
    {
      header: 'Actions',
      accessor: (row: PartyDispatchRecord) => {
        const canManage = isOwner || (user?.role === 'WAREHOUSE_MGMT' && row.userId === user?.id);
        return (
          <div className="flex justify-end gap-2">
            {canManage ? (
              <>
                <button
                  onClick={() => handleEditClick(row)}
                  className="p-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-700 hover:text-white dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-600 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteRecord(row)}
                  className="p-1 rounded-lg bg-rose-500/10 text-rose-700 hover:bg-rose-700 hover:text-white dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-600 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-xs text-stone-400 italic" title="No permission to edit this entry.">Submitted</span>
            )}
          </div>
        );
      },
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-700 dark:text-amber-500" />
            <span>Party Dispatch Register</span>
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Log and track outbound dispatches to parties with bill and challan details.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <>
              <button
                onClick={() => { setLogsPage(1); setLogsOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 border border-stone-200 dark:border-stone-800 bg-white hover:bg-stone-50 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-sm transition-all cursor-pointer"
              >
                <span>Activity Logs</span>
              </button>
              <ExportButtons
                title="Party Dispatch Register"
                dataType="warehouse"
                data={records}
                headers={['Date', 'Bill No.', 'Challan No.', 'Party Name', 'Item Name', 'Quantity', 'Slip No.', 'By Person', 'Recorded By']}
                keys={['created_at', 'bill_number', 'challan_number', 'party_name', 'item_name', 'quantity', 'slip_number', 'by_person', 'user']}
              />
            </>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">Filters & Search</h3>
          <button onClick={clearFilters} className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400 transition-colors cursor-pointer">
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: 'Bill Number', value: filterBill, setter: setFilterBill, placeholder: 'Search bill...' },
            { label: 'Party Name', value: filterParty, setter: setFilterParty, placeholder: 'Search party...' },
            { label: 'Item Name', value: filterItem, setter: setFilterItem, placeholder: 'Search item...' },
            { label: 'Slip Number', value: filterSlip, setter: setFilterSlip, placeholder: 'Search slip...' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label} className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase">{label}</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => { setter(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 pl-8 pr-3 text-xs outline-hidden focus:border-amber-600 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          ))}
          {isOwner && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Recorded By</span>
              <select
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">All Users</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Start Date</span>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">End Date</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent py-1.5 px-3 text-xs outline-hidden focus:border-amber-600 dark:bg-stone-900 text-stone-900 dark:text-stone-100" />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <DataTable
        columns={columns}
        data={records}
        isLoading={loading}
        currentPage={page}
        totalPages={Math.ceil(total / limit)}
        onPageChange={setPage}
        emptyMessage="No party dispatch records match your filters."
      />

      {/* ═══════════════════════ CREATE MODAL ═══════════════════════ */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }} title="Add Party Dispatch Entry">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Bill Number</label>
              <input id="pd-bill-number" type="text" required placeholder="e.g. BILL-1001" value={billNumber} onChange={(e) => setBillNumber(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Challan Number</label>
              <input id="pd-challan-number" type="text" required placeholder="e.g. CHN-2001" value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Party Name</label>
              <input id="pd-party-name" type="text" required placeholder="e.g. Sharma Traders" value={partyName} onChange={(e) => setPartyName(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Item / Product Name</label>
              <input id="pd-item-name" type="text" required placeholder="e.g. Cement Bags" value={itemName} onChange={(e) => setItemName(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Quantity</label>
              <input id="pd-quantity" type="number" required min="1" placeholder="e.g. 50" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Slip Number (Unique)</label>
              <input id="pd-slip-number" type="text" required placeholder="e.g. SLIP-5001" value={slipNumber} onChange={(e) => setSlipNumber(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">By Person (Operator)</label>
              <input id="pd-by-person" type="text" required placeholder="e.g. Ramesh Kumar" value={byPerson} onChange={(e) => setByPerson(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setCreateOpen(false); resetCreateForm(); }}
              className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-sm">
              {submitting ? 'Saving...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════ EDIT MODAL (Owner only) ═══════════════════════ */}
      <Modal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Party Dispatch Entry">
        {editRecord && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <p className="text-xs text-stone-400">Recorded by: <span className="font-semibold text-stone-700 dark:text-stone-300">{editRecord.user?.username}</span> on {formatDate(editRecord.created_at.split('T')[0])}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Bill Number', value: editBillNumber, setter: setEditBillNumber, id: 'edit-pd-bill', mono: true },
                { label: 'Challan Number', value: editChallanNumber, setter: setEditChallanNumber, id: 'edit-pd-challan', mono: true },
                { label: 'Party Name', value: editPartyName, setter: setEditPartyName, id: 'edit-pd-party', mono: false },
                { label: 'Item / Product Name', value: editItemName, setter: setEditItemName, id: 'edit-pd-item', mono: false },
                { label: 'Slip Number', value: editSlipNumber, setter: setEditSlipNumber, id: 'edit-pd-slip', mono: true },
                { label: 'By Person', value: editByPerson, setter: setEditByPerson, id: 'edit-pd-person', mono: false },
              ].map(({ label, value, setter, id, mono }) => (
                <div key={id} className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">{label}</label>
                  <input id={id} type="text" required value={value} onChange={(e) => setter(e.target.value)}
                    className={`w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-stone-900 dark:text-stone-100 ${mono ? 'font-mono' : ''}`} />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400">Quantity</label>
                <input id="edit-pd-quantity" type="number" required min="1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-mono text-stone-900 dark:text-stone-100" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditRecord(null)}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              Cancel
            </button>
              <button type="submit" disabled={editSubmitting}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-sm">
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════════════════════ DELETE MODAL (Owner only) ═══════════════════════ */}
      <Modal isOpen={!!deleteRecord} onClose={() => setDeleteRecord(null)} title="Confirm Deletion">
        {deleteRecord && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Are you sure you want to permanently delete this party dispatch record?
            </p>
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-2">
              <div><span className="font-semibold text-stone-500">Slip #:</span>{' '}<span className="font-mono text-stone-800 dark:text-stone-200">{deleteRecord.slip_number}</span></div>
              <div><span className="font-semibold text-stone-500">Party:</span>{' '}<span className="text-stone-800 dark:text-stone-200">{deleteRecord.party_name}</span></div>
              <div><span className="font-semibold text-stone-500">Item:</span>{' '}<span className="text-stone-800 dark:text-stone-200">{deleteRecord.item_name}</span></div>
              <div><span className="font-semibold text-stone-500">Quantity:</span>{' '}<span className="font-semibold text-amber-700 dark:text-amber-400 font-mono">{deleteRecord.quantity}</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDeleteRecord(null)}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteSubmitting}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-sm">
                {deleteSubmitting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════ ACTIVITY LOGS MODAL (Owner only) ═══════════════════════ */}
      <Modal isOpen={logsOpen} onClose={() => setLogsOpen(false)} title="Warehouse Activity Logs" size="large">
        <div className="space-y-4">
          <DataTable
            columns={[
              { header: 'Time', accessor: (row: any) => `${formatDate(row.createdAt.split('T')[0])} ${formatTime(row.createdAt.split('T')[1].split('.')[0])}` },
              { header: 'Operator', accessor: (row: any) => row.user?.username || 'System' },
              {
                header: 'Action',
                accessor: (row: any) => (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    row.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                    row.action === 'UPDATE' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                    'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                  }`}>
                    {row.action}
                  </span>
                )
              },
              { header: 'Register', accessor: (row: any) => row.tableName === 'WarehousePartyDispatch' ? 'Party Dispatch' : 'Shop Transfer' },
              {
                header: 'Details',
                accessor: (row: any) => {
                  if (!row.details) return '-';
                  const d = row.details;
                  if (row.action === 'CREATE') {
                    return `Created entry (Slip: ${d.slip_number || '-'}, Qty: ${d.quantity || '-'})`;
                  }
                  if (row.action === 'UPDATE') {
                    return `Updated: ${Object.keys(d).map(k => `${k}: ${d[k]}`).join(', ')}`;
                  }
                  if (row.action === 'DELETE') {
                    return `Deleted entry`;
                  }
                  return JSON.stringify(d);
                }
              }
            ]}
            data={logs}
            isLoading={logsLoading}
            currentPage={logsPage}
            totalPages={Math.ceil(logsTotal / 10)}
            onPageChange={setLogsPage}
            emptyMessage="No activity logs recorded yet."
          />
        </div>
      </Modal>
    </div>
  );
}
