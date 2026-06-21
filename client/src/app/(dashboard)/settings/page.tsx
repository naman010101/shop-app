'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Shield, Key, User, CheckCircle, AtSign, Save, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const { user, checkAuth } = useAuth();

  // ── Change Username ─────────────────────────────────────────────────────────
  const [newUsername, setNewUsername] = useState('');
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.error('Please enter a new username.');
      return;
    }
    if (newUsername.trim().toLowerCase() === user?.username) {
      toast.error('New username must be different from the current one.');
      return;
    }
    setUsernameSubmitting(true);
    try {
      await api.put('/auth/change-username', { newUsername: newUsername.trim() });
      toast.success('Username updated successfully!');
      setNewUsername('');
      await checkAuth(); // refresh sidebar / header instantly
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update username.';
      toast.error(msg);
    } finally {
      setUsernameSubmitting(false);
    }
  };

  // ── Change Password ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setPwSubmitting(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update password. Verify your current password.';
      toast.error(msg);
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your login credentials and profile details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Profile Card ── */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span>User Profile</span>
            </h2>

            <div className="flex flex-col items-center justify-center text-center p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
              <div className="h-16 w-16 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xl uppercase mb-3">
                {user?.username.slice(0, 2)}
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                @{user?.username}
              </span>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-3 h-3" />
                {user?.role}
              </span>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Account Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Current Session:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Valid</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: username + password forms ── */}
        <div className="md:col-span-2 space-y-5">

          {/* Change Username */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
              <AtSign className="w-4 h-4 text-indigo-500" />
              <span>Change Username</span>
            </h2>

            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              {/* Current username (read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Current Username
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 py-2.5 px-3.5">
                  <span className="text-slate-400 text-sm">@</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user?.username}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  New Username (min. 3 characters)
                </label>
                <input
                  id="new-username"
                  type="text"
                  required
                  placeholder="e.g. admin_new"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  id="btn-save-username"
                  disabled={usernameSubmitting}
                  className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{usernameSubmitting ? 'Saving…' : 'Save Username'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>Update Password</span>
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  New Password (min. 6 characters)
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="btn-update-password"
                  type="submit"
                  disabled={pwSubmitting}
                  className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>{pwSubmitting ? 'Updating…' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
