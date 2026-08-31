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
      <div className="flex h-screen w-screen items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-muted-foreground mt-2">Verifying session...</span>
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 flex flex-col">
      {/* Mobile Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Warm Cream Floating Top Header matching reference design */}
      <header className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer shadow-pill"
            >
              <Menu className="size-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-card text-lg font-bold text-foreground shadow-pill">
                ₹
              </span>
              <span>
                <span className="block font-display text-2xl leading-none tracking-tight">
                  Cash Terminal
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Shop ledger · Main store
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="num hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs shadow-pill">
              <span className="size-1.5 rounded-full bg-chart-1" />
              {currentDate}
            </span>
            <ThemeToggle />
            <button className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-pill transition-colors hover:bg-primary/90 cursor-pointer">
              <Plus className="size-4" />
              New Entry
            </button>
            <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tab Bar Navigation (Floating Pill Container) */}
        <nav className="mt-6 overflow-x-auto rounded-full border border-border bg-card px-3 py-2 shadow-pill">
          <ul className="flex items-center gap-1 whitespace-nowrap">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'inline-block rounded-full px-4 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-col flex-1">
        <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
