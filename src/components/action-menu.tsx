'use client';

import React, { useState } from 'react';

interface ActionMenuProps {
  enrollments?: any[];
  totalRevenue?: number;
  revenueBySubject?: any;
}

export default function ActionMenu({ enrollments = [] }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
      >
        <span>⚡ Chức năng nhanh</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-xs">
          <div className="px-4 py-2 text-slate-400 border-b border-slate-100 font-semibold">
            Tổng số: {enrollments.length} học viên
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              window.print();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium"
          >
            🖨️ In danh sách học viên
          </button>
        </div>
      )}
    </div>
  );
}
