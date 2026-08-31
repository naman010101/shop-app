import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  badge,
  children,
  bodyClassName = "",
}: {
  title: string;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        {badge}
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="label-caps rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
      {children}
    </span>
  );
}
