'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  Users,
  Settings,
  LogOut,
  X,
  Menu,
  Wallet
} from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'STAFF'] },
    { name: 'Balance Management', href: '/balance', icon: Wallet, roles: ['OWNER', 'STAFF'] },
    { name: 'Cash Inflow', href: '/inflow', icon: ArrowDownLeft, roles: ['OWNER', 'STAFF'] },
    { name: 'Sales', href: '/sales', icon: TrendingUp, roles: ['OWNER', 'STAFF'] },
    { name: 'Cash Outflow', href: '/outflow', icon: ArrowUpRight, roles: ['OWNER', 'STAFF'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['OWNER'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['OWNER'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['OWNER', 'STAFF'] },
  ];

  const filteredNavigation = navigation.filter(
    (item) => item.roles.includes(user?.role || 'STAFF')
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Brand Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-wider text-indigo-400">
          <TrendingUp className="w-6 h-6 text-indigo-400" />
          <span>CASHFLOW</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-200"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info / Logout */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col truncate">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Logged in as
            </span>
            <span className="text-sm font-medium text-slate-200 truncate">
              {user?.username}
            </span>
            <span className="text-[10px] font-bold text-indigo-400 mt-0.5">
              {user?.role}
            </span>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer (Slide in) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
