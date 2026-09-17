'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteStudentsModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codesInput, setCodesInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    const codes = codesInput
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c !== '');

    if (codes.length === 0) {
      alert('Vui lòng nhập ít nhất 1 mã học viên!');
      return;
    }

    if (!confirm(`⚠️ CẢNH BÁO:\nBạn có chắc chắn muốn xóa ${codes.length} học viên sau đây:\n${codes.join(', ')}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentCodes: codes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      setCodesInput('');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition text-left"
      >
        <span>🗑️</span> Xóa HV Hàng Loạt
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-rose-700 text-base">🗑️ Xóa Học Viên Nghỉ Học</h3>
                <p className="text-xs text-slate-500">Nhập danh sách mã học viên cách nhau bởi dấu phẩy</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleDelete} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Danh sách Mã HV *</label>
                <input
                  required
                  placeholder="VD: P01, D01, G02, K01"
                  value={codesInput}
                  onChange={(e) => setCodesInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono uppercase font-bold focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 inline-block">
                  Học viên sẽ được lưu trữ an toàn (Soft delete) và không xuất hiện trên Dashboard.
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  {loading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
