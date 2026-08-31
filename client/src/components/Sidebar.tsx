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
  Wallet,
  Package,
  ArrowLeftRight
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'CASHIER', 'WAREHOUSE_MGMT'] },
    { name: 'Balance Management', href: '/balance', icon: Wallet, roles: ['OWNER', 'CASHIER'] },
    { name: 'Cash Inflow', href: '/inflow', icon: ArrowDownLeft, roles: ['OWNER', 'CASHIER'] },
    { name: 'Sales', href: '/sales', icon: TrendingUp, roles: ['OWNER', 'CASHIER'] },
    { name: 'Cash Outflow', href: '/outflow', icon: ArrowUpRight, roles: ['OWNER', 'CASHIER'] },
    { name: 'Party Dispatch Register', href: '/party-dispatch', icon: Package, roles: ['OWNER', 'WAREHOUSE_MGMT'] },
    { name: 'Shop Stock Transfer Register', href: '/shop-transfer', icon: ArrowLeftRight, roles: ['OWNER', 'WAREHOUSE_MGMT'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['OWNER'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['OWNER'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['OWNER', 'CASHIER', 'WAREHOUSE_MGMT'] },
  ];

  const filteredNavigation = navigation.filter(
    (item) => item.roles.includes(user?.role || 'CASHIER')
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 border-r border-stone-800">
      {/* Brand Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-stone-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-wider text-amber-500 font-serif" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-lg font-sans">
            ₹
          </div>
          <span className="capitalize normal-case tracking-normal">Cash Terminal</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md text-stone-400 hover:text-stone-200 cursor-pointer"
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
                  ? 'bg-amber-700 text-white shadow-lg shadow-amber-700/30'
                  : 'text-stone-400 hover:bg-stone-800/60 hover:text-stone-200'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-200'
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info / Logout */}
      <div className="p-4 border-t border-stone-800 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col truncate">
            <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
              Logged in as
            </span>
            <span className="text-sm font-medium text-stone-200 truncate">
              {user?.username}
            </span>
            <span className="text-[10px] font-bold text-amber-500 mt-0.5">
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
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm lg:hidden"
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
