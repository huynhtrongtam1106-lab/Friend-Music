'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Lớp nhóm: bấm "Đã thu" để dời hạn đóng tiền sang tháng sau (giữ nguyên ngày đóng của chu kỳ). */
export default function GroupPaidButton({
  enrollmentId,
  studentName,
  nextDueText,
}: {
  enrollmentId: string;
  studentName: string;
  nextDueText: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm(`Xác nhận đã thu học phí tháng này của ${studentName}?\nHạn đóng tiền sẽ dời sang ${nextDueText}.`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students/group-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-[11px] border border-emerald-200 disabled:opacity-50 whitespace-nowrap"
      title="Đánh dấu đã thu học phí, dời hạn sang tháng sau"
    >
      {loading ? '...' : '💰 Đã thu'}
    </button>
  );
}
