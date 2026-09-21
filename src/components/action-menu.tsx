'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AddTeacherDialog from '@/components/add-teacher-dialog';
import DeleteStudentsDialog from '@/components/delete-students-dialog';
import ManagePricingPlansDialog from '@/components/manage-pricing-plans-dialog';

export default function ActionMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plansDialogOpen, setPlansDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition border border-slate-200"
          title="Mở rộng chức năng"
        >
          •••
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Công cụ quản trị
            </p>

            <Link
              href="/teacher/attendance"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition"
            >
              <span>📱</span> Cổng Điểm Danh GV
            </Link>

            <div className="border-t border-slate-100 my-1"></div>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setTeacherDialogOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left"
            >
              <span>👨‍🏫</span> Thêm Giáo Viên Mới
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setPlansDialogOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left"
            >
              <span>💰</span> Quản Lý Gói Học
            </button>

            <div className="border-t border-slate-100 my-1"></div>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setDeleteDialogOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition text-left"
            >
              <span>🗑️</span> Xóa HV Hàng Loạt
            </button>
          </div>
        )}
      </div>

      {/* Các Dialog đặt ngoài phạm vi Dropdown để không bị chặn sự kiện */}
      <ManagePricingPlansDialog open={plansDialogOpen} onClose={() => setPlansDialogOpen(false)} />
      <AddTeacherDialog
        open={teacherDialogOpen}
        onClose={() => setTeacherDialogOpen(false)}
      />

      <DeleteStudentsDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}
