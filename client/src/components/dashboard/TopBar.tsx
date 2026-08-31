'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

const NAV = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Inflow", href: "/inflow" },
  { name: "Outflow", href: "/outflow" },
  { name: "Balance", href: "/balance" },
  { name: "Sales", href: "/sales" },
  { name: "Party Dispatch", href: "/party-dispatch" },
  { name: "Shop Transfer", href: "/shop-transfer" },
  { name: "Reports", href: "/reports" },
  { name: "Users", href: "/users" },
  { name: "Settings", href: "/settings" },
];

export function TopBar({ dateLabel }: { dateLabel: string }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-card text-lg text-primary shadow-pill">
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

        <div className="flex items-center gap-3">
          <span className="num flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs shadow-pill">
            <span className="size-1.5 rounded-full bg-chart-1" />
            {dateLabel}
          </span>
          <ThemeToggle />
          <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-pill transition-colors hover:bg-primary/90">
            + New Entry
          </button>
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-xs font-medium text-primary-foreground">
            AV
          </span>
        </div>
      </div>

      <nav className="mt-6 overflow-x-auto rounded-full border border-border bg-card px-3 py-2 shadow-pill">
        <ul className="flex items-center gap-1 whitespace-nowrap">
          {NAV.map((item, i) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`inline-block rounded-full px-4 py-2 text-sm transition-colors ${
                  i === 0
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
