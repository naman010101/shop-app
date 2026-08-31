'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', roles: ['OWNER', 'CASHIER', 'WAREHOUSE_MGMT'] },
  { name: 'Inflow', href: '/inflow', roles: ['OWNER', 'CASHIER'] },
  { name: 'Outflow', href: '/outflow', roles: ['OWNER', 'CASHIER'] },
  { name: 'Balance', href: '/balance', roles: ['OWNER', 'CASHIER'] },
  { name: 'Sales', href: '/sales', roles: ['OWNER', 'CASHIER'] },
  { name: 'Party Dispatch', href: '/party-dispatch', roles: ['OWNER', 'WAREHOUSE_MGMT'] },
  { name: 'Shop Transfer', href: '/shop-transfer', roles: ['OWNER', 'WAREHOUSE_MGMT'] },
  { name: 'Reports', href: '/reports', roles: ['OWNER'] },
  { name: 'Users', href: '/users', roles: ['OWNER'] },
  { name: 'Settings', href: '/settings', roles: ['OWNER', 'CASHIER', 'WAREHOUSE_MGMT'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Route guarding in case middleware fails or state updates slowly
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAF7F2] dark:bg-stone-950 text-amber-700">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-stone-500 mt-2">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredNavigation = navigation.filter(
    (item) => item.roles.includes(user.role || 'CASHIER')
  );

  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-stone-950 transition-colors duration-200 flex flex-col">
      {/* Mobile Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Header */}
      <header className="sticky top-0 z-30 flex flex-col w-full bg-stone-950">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8 border-b border-stone-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:bg-stone-800 cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-lg font-sans">
                ₹
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-lg font-serif font-medium text-white">
                  Cash Terminal
                </span>
                <span className="text-xs text-stone-400">
                  Shop ledger • Main store
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center px-3 py-1 bg-emerald-700/20 text-emerald-400 rounded-full text-sm font-medium border border-emerald-700/30">
              {currentDate}
            </div>
            <ThemeToggle />
            <button className="hidden sm:flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              New Entry
            </button>
            <div className="h-9 w-9 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/30 flex items-center justify-center font-bold text-sm uppercase">
              {user.username.slice(0, 2)}
            </div>
          </div>
        </div>

        {/* Tab Bar Navigation (Desktop) */}
        <div className="hidden lg:flex items-center gap-1 px-8 py-2 overflow-x-auto bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 no-scrollbar">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-col flex-1 min-h-screen">
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
