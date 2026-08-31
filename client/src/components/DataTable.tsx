'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode) | string;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found.',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-900/50 text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider text-xs">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-2/3"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-stone-400 dark:text-stone-500 font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20 transition-colors duration-150"
                >
                  {columns.map((column, colIndex) => {
                    let content: React.ReactNode = null;

                    if (typeof column.accessor === 'function') {
                      content = column.accessor(row);
                    } else if (column.accessor) {
                      content = (row as Record<string, unknown>)[column.accessor as string] as React.ReactNode;
                    }

                    return (
                      <td
                        key={colIndex}
                        className={`px-6 py-4 whitespace-nowrap align-middle ${column.className || ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/30 text-xs">
          <div className="text-stone-500">
            Page <span className="font-semibold text-stone-700 dark:text-stone-300">{currentPage}</span> of{' '}
            <span className="font-semibold text-stone-700 dark:text-stone-300">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
