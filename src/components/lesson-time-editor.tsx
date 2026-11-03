'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Admin sửa giờ học của 1 buổi dạy ngay trong báo cáo
export default function LessonTimeEditor({
  attendanceIds,
  startTime,
  scheduleHint,
}: {
  attendanceIds: string[];
  startTime: string | null;
  scheduleHint: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(startTime || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/attendance-time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceIds, startTime: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="text-xs p-1 border border-slate-200 rounded-lg"
        />
        <button
          onClick={save}
          disabled={loading}
          className="px-2 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-lg disabled:opacity-50"
        >
          Lưu
        </button>
        <button onClick={() => setEditing(false)} className="px-2 py-1 text-[11px] font-bold text-slate-500">
          Hủy
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {startTime ? (
        <span className="font-mono font-bold text-slate-800">{startTime}</span>
      ) : (
        <span className="text-slate-400" title="Chưa có giờ thực tế, đang hiển thị theo lịch cố định">
          {scheduleHint ? `(${scheduleHint})` : '—'}
        </span>
      )}
      <button onClick={() => setEditing(true)} className="text-[11px] font-bold text-indigo-600 hover:underline">
        Sửa
      </button>
    </span>
  );
}
