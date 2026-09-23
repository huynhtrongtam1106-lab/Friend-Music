'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RestoreStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRestore = async () => {
    if (!confirm(`Chuyển học viên "${studentName}" về trạng thái Đang học?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentId,
          fullName: studentName,
          status: 'ACTIVE',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi khôi phục học viên!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRestore}
      disabled={loading}
      className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-[11px]"
      title="Khôi phục về Đang học"
    >
      {loading ? '...' : '↩️ Đang học'}
    </button>
  );
}
