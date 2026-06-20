'use client';

import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

interface ExportButtonsProps {
  title: string;
  dataType: 'inflow' | 'sales' | 'outflow' | 'reports' | 'users';
  data: any[];
  headers: string[];
  keys: string[];
}

export default function ExportButtons({
  title,
  dataType,
  data,
  headers,
  keys,
}: ExportButtonsProps) {
  const filename = `${dataType}_export_${new Date().toISOString().slice(0, 10)}`;

  const handleExportExcel = () => {
    if (!data.length) return;

    // Convert data to readable objects
    const formattedData = data.map((item) => {
      const obj: any = {};
      keys.forEach((key, index) => {
        const header = headers[index];
        let val = item[key];

        // Format special fields
        if (key === 'amount') {
          obj[header] = parseFloat(val);
        } else if (key === 'date') {
          obj[header] = formatDate(val);
        } else if (key === 'time') {
          obj[header] = formatTime(val);
        } else if (key === 'user') {
          obj[header] = val?.username || '';
        } else {
          obj[header] = val || '';
        }
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    
    // Auto-adjust column widths
    const maxCols = keys.length;
    const colWidths = Array(maxCols).fill(15);
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!data.length) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Sub-title with timestamp
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Format table body rows
    const body = data.map((item) => {
      return keys.map((key) => {
        let val = item[key];
        if (key === 'amount') {
          return `INR ${parseFloat(val).toFixed(2)}`;
        } else if (key === 'date') {
          return formatDate(val);
        } else if (key === 'time') {
          return formatTime(val);
        } else if (key === 'user') {
          return val?.username || '';
        }
        return val || '';
      });
    });

    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo color matching our brand
      styles: { fontSize: 9 },
    });

    doc.save(`${filename}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportExcel}
        disabled={data.length === 0}
        className="flex items-center gap-2 px-4 py-2 border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl text-sm transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-emerald-50 dark:disabled:hover:bg-emerald-950/20"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Export Excel</span>
      </button>
      <button
        onClick={handleExportPDF}
        disabled={data.length === 0}
        className="flex items-center gap-2 px-4 py-2 border border-rose-200 dark:border-rose-800/30 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-medium rounded-xl text-sm transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-rose-50 dark:disabled:hover:bg-rose-950/20"
      >
        <FileText className="w-4 h-4" />
        <span>Export PDF</span>
      </button>
    </div>
  );
}
