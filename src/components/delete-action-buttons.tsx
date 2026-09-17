'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa học viên "${studentName}" không?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-slate-400 hover:text-rose-600 font-bold p-1 transition"
      title="Xóa học viên"
    >
      {loading ? '...' : '✕'}
    </button>
  );
}

export function DeleteTeacherButton({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc muốn xóa giáo viên "${teacherName}" không?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/teachers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-slate-300 hover:text-rose-500 font-bold text-xs p-1 transition"
      title="Xóa giáo viên"
    >
      {loading ? '...' : '🗑️'}
    </button>
  );
}
