'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  fullName: string;
  phone: string | null;
  parentPhone: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'DROPPED';
  note: string | null;
}

interface Props {
  student: Student;
  open: boolean;
  onClose: () => void;
}

export default function EditStudentDialog({ student, open, onClose }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(student.fullName);
  const [phone, setPhone] = useState(student.phone || '');
  const [parentPhone, setParentPhone] = useState(student.parentPhone || '');
  const [status, setStatus] = useState(student.status);
  const [note, setNote] = useState(student.note || '');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, parentPhone, status, note }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('🎉 Cập nhật thông tin học viên thành công!');
      onClose();
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-base">✏️ Chỉnh Sửa Học Viên</h3>
            <p className="text-xs text-slate-500">Cập nhật thông tin cá nhân học viên</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Họ và Tên *</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Số điện thoại học viên</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">SĐT Phụ huynh</label>
            <input
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Trạng thái học viên</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
            >
              <option value="ACTIVE">Đang học (ACTIVE)</option>
              <option value="PAUSED">Tạm nghỉ (PAUSED)</option>
              <option value="DROPPED">Nghỉ học (DROPPED)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer transition"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer transition hover:bg-slate-200"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}