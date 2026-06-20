'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  color?: 'indigo' | 'emerald' | 'rose' | 'amber';
}

export default function KPICard({
  title,
  value,
  icon,
  description,
  trend,
  color = 'indigo',
}: KPICardProps) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/5 border-indigo-500/20 dark:border-indigo-500/10',
      iconBg: 'bg-indigo-500 text-white',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/5 border-emerald-500/20 dark:border-emerald-500/10',
      iconBg: 'bg-emerald-500 text-white',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/5 border-rose-500/20 dark:border-rose-500/10',
      iconBg: 'bg-rose-500 text-white',
      text: 'text-rose-600 dark:text-rose-400',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/5 border-amber-500/20 dark:border-amber-500/10',
      iconBg: 'bg-amber-500 text-white',
      text: 'text-amber-600 dark:text-amber-400',
    },
  };

  const selectedColor = colorMap[color];

  return (
    <div
      className={cn(
        'p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/5',
        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50 mt-2">
            {value}
          </h3>
        </div>
        <div className={cn('p-3.5 rounded-xl', selectedColor.iconBg)}>
          {icon}
        </div>
      </div>
      {(description || trend) && (
        <div className="flex items-center gap-2 mt-4 text-xs">
          {trend && (
            <span
              className={cn(
                'font-bold px-2 py-0.5 rounded-full',
                trend.type === 'positive' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                trend.type === 'negative' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                trend.type === 'neutral' && 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
              )}
            >
              {trend.value}
            </span>
          )}
          {description && (
            <span className="text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
