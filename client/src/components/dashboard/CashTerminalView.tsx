'use client';

import { TopBar } from "@/components/dashboard/TopBar";
import { Panel, Badge } from "@/components/dashboard/Panel";
import { EntryTable } from "@/components/dashboard/EntryTable";
import {
  balance,
  formatINR,
  inflows,
  outflows,
  stats,
  totals,
  weekly,
} from "@/data/ledger";

export function CashTerminalView() {
  const max = Math.max(...weekly);

  return (
    <div className="min-h-screen pb-16">
      <TopBar dateLabel="Mon, 31 Aug, 2026" />

      <main className="mx-auto w-full max-w-6xl px-6">
        <div className="mt-8 rounded-2xl border border-border bg-card/70 px-5 py-3.5 text-sm text-muted-foreground">
          <span className="mr-2 inline-block size-1.5 rounded-full bg-chart-1 align-middle" />
          Showing sample figures — connect your cash API by setting{" "}
          <code className="num rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
            NEXT_PUBLIC_API_URL
          </code>{" "}
          to your server URL.
        </div>

        {/* Date navigation */}
        <div className="mt-8 flex items-center justify-end gap-2">
          <button className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground">
            ‹
          </button>
          <input
            type="date"
            defaultValue="2026-08-31"
            className="num rounded-full border border-border bg-card px-4 py-2 text-sm shadow-pill outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground">
            ›
          </button>
        </div>

        {/* Hero: cash position + sparkline */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="label-caps">Cash position · 31 Aug</p>
            <p className="num mt-2 text-6xl font-semibold tracking-tight">
              ₹{formatINR(balance.closing)}
              <span className="text-2xl text-muted-foreground">.00</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-inflow">▲ Inflow ₹{formatINR(totals.inflow)}</span>
              <span className="text-outflow">▼ Outflow ₹{formatINR(totals.outflow)}</span>
              <Badge>Approved</Badge>
            </div>
          </div>

          <div className="panel w-full max-w-xs p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Last 7 days</span>
              <span className="num text-xs text-muted-foreground">net ₹23.5K</span>
            </div>
            <div className="mt-4 flex h-20 items-end gap-2">
              {weekly.map((v, i) => (
                <div
                  key={i}
                  title={`₹${v}K`}
                  style={{ height: `${(v / max) * 100}%` }}
                  className={`flex-1 rounded-md ${
                    i === weekly.length - 1 ? "bg-chart-1" : "bg-chart-2"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Inflows + balance check */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Panel
            title="Inflows · 31 Aug"
            action={
              <button className="text-sm text-primary transition-opacity hover:opacity-70">
                View all →
              </button>
            }
            bodyClassName="pt-4"
          >
            <EntryTable entries={inflows} direction="in" />
          </Panel>

          <Panel title="Balance check" badge={<Badge>Approved</Badge>} bodyClassName="p-6">
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <dt>Opening balance</dt>
                <dd className="num font-medium">₹{formatINR(balance.opening)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Net movement</dt>
                <dd className="num font-medium text-inflow">+₹{formatINR(balance.net)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <dt className="font-medium">Closing balance</dt>
                <dd className="num text-xl font-semibold text-primary">
                  ₹{formatINR(balance.closing)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-card text-inflow">
                ✓
              </span>
              <span>
                <span className="block text-sm font-medium">
                  Verified by {balance.verifiedBy}
                </span>
                <span className="num block text-xs text-muted-foreground">
                  {balance.verifiedAt} · {balance.slips} slips
                </span>
              </span>
            </div>

            <button className="mt-4 w-full rounded-2xl border border-border py-3 text-sm transition-colors hover:bg-secondary">
              Open reconciliation
            </button>
          </Panel>
        </div>

        {/* Outflow + stats */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Panel
            title="Outflow & dispatch"
            action={
              <button className="text-sm text-primary transition-opacity hover:opacity-70">
                Reports →
              </button>
            }
            bodyClassName="pt-4"
          >
            <EntryTable
              entries={outflows}
              direction="out"
              headings={["Head / voucher", "Remarks", "Time", "Amount"]}
            />
          </Panel>

          <div className="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden">
            {stats.map((s) => (
              <div key={s.label} className="p-6">
                <p className="label-caps">{s.label}</p>
                <p className="num mt-2 text-2xl font-semibold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
