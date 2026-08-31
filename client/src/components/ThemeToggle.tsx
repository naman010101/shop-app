'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Warm Cream Mode'}
      className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 shadow-sm transition-all duration-200 cursor-pointer text-xs font-semibold"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-4 h-4 text-stone-700 transition-transform hover:rotate-12" />
          <span>Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          <span>Warm Cream</span>
        </>
      )}
    </button>
  );
}
