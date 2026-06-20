'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { UserPlus, Edit2, Lock, Power, RefreshCw, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserRecord {
  id: string;
  username: string;
  role: 'OWNER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'OWNER';

  // Users List State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [resetUser, setResetUser] = useState<UserRecord | null>(null);

  // Form Field States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      toast.error('Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchUsers();
    }
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full">
          <Lock className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Access Denied</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Only the Shop Owner (Admin) can manage user accounts. Please contact the administrator.
        </p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      await api.post('/users', {
        username: username.trim().toLowerCase(),
        password,
        role,
      });
      toast.success(`User '${username}' created successfully!`);
      // Reset form
      setUsername('');
      setPassword('');
      setRole('STAFF');
      setCreateOpen(false);
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to create user.';
      toast.error(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditClick = (u: UserRecord) => {
    setEditUser(u);
    setEditUsername(u.username);
    setEditRole(u.role);
    setEditIsActive(u.isActive);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    try {
      await api.put(`/users/${editUser.id}`, {
        username: editUsername.trim().toLowerCase(),
        role: editRole,
        isActive: editIsActive,
      });
      toast.success('User updated successfully!');
      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update user.';
      toast.error(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleStatusToggle = async (u: UserRecord) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    const nextActive = !u.isActive;
    try {
      await api.put(`/users/${u.id}`, {
        isActive: nextActive,
      });
      toast.success(`User account ${nextActive ? 'activated' : 'deactivated'} successfully.`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to change user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetSubmitting(true);
    try {
      await api.post(`/users/${resetUser.id}/reset-password`, {
        newPassword,
      });
      toast.success(`Password for '${resetUser.username}' reset successfully!`);
      setNewPassword('');
      setResetUser(null);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to reset password.';
      toast.error(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  const columns = [
    { header: 'Username', accessor: 'username' },
    {
      header: 'Role',
      accessor: (row: UserRecord) => {
        const style = row.role === 'OWNER' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${style}`}>{row.role}</span>;
      }
    },
    {
      header: 'Status',
      accessor: (row: UserRecord) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold ${
            row.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
          {row.isActive ? 'Active' : 'Deactivated'}
        </span>
      )
    },
    { header: 'Created At', accessor: (row: UserRecord) => formatDate(row.createdAt.split('T')[0]) },
    {
      header: 'Actions',
      accessor: (row: UserRecord) => {
        const isSelf = row.id === currentUser?.id;
        return (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleEditClick(row)}
              className="p-1 rounded bg-indigo-500/10 text-indigo-600 hover:bg-indigo-50 hover:text-white transition-colors cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setResetUser(row)}
              className="p-1 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
              title="Reset Password"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            {!isSelf && (
              <button
                onClick={() => handleStatusToggle(row)}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  row.isActive
                    ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                }`}
                title={row.isActive ? 'Deactivate Account' : 'Activate Account'}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
      className: 'text-right'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <span>Staff Account Desk</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, edit roles, deactivate staff, and reset account passwords.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* User Records Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
        emptyMessage="No users found."
      />

      {/* Create User Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add New User Account"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Username / User ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. cashier_ramesh"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Account Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500 dark:bg-slate-900"
            >
              <option value="STAFF">Staff User</option>
              <option value="OWNER">Owner (Admin)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Add User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User Profile"
      >
        {editUser && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Username / User ID
              </label>
              <input
                type="text"
                required
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Account Role
              </label>
              <select
                value={editRole}
                disabled={editUser.id === currentUser?.id}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500 dark:bg-slate-900"
              >
                <option value="STAFF">Staff User</option>
                <option value="OWNER">Owner (Admin)</option>
              </select>
            </div>

            <div className="space-y-1.5 flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Status</span>
                <span className="text-[10px] text-slate-400">Inactive accounts cannot sign in</span>
              </div>
              <input
                type="checkbox"
                checked={editIsActive}
                disabled={editUser.id === currentUser?.id}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-4 w-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title="Reset Account Password"
      >
        {resetUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-slate-500">
              Specify a new login password for user <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">@{resetUser.username}</span>.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-sm outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Reset Password
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
