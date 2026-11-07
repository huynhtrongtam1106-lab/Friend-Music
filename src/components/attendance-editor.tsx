'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_LABEL: Record<string, string> = {
  ATTENDED: 'Có mặt',
  ABSENT_EXCUSED: 'Vắng có phép',
  ABSENT_UNEXCUSED: 'Vắng không phép',
};

// Dòng học viên trong báo cáo, kèm nút Sửa điểm danh (chỉ trang Admin mới dùng component này)
export default function AttendanceEditor({
  attendanceId,
  name,
  code,
  status,
  date,
}: {
  attendanceId: string;
  name: string;
  code: string;
  status: string;
  date: string; // YYYY-MM-DD
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(status);
  const [newDate, setNewDate] = useState(date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId, status: newStatus, date: newDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(data.error || 'Không lưu được');
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (
      !confirm(
        `Xóa điểm danh của ${name} ngày ${date.split('-').reverse().join('/')}?\n\nBài tập và nhận xét của buổi này cũng bị xóa. Nếu buổi đang là "Có mặt" thì hệ thống hoàn lại 1 buổi cho học viên.`
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?id=${encodeURIComponent(attendanceId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) router.refresh();
      else setError(data.error || 'Không xóa được');
    } finally {
      setLoading(false);
    }
  };

  const selectCls = 'text-xs p-1.5 border border-slate-200 rounded-lg bg-white';

  return (
    <div className="text-slate-900">
      <span>
        <b>{name}</b> <span className="text-slate-400">({code})</span>
        {status !== 'ATTENDED' && (
          <span
            className={`ml-1 font-bold px-1.5 py-0.5 rounded ${
              status === 'ABSENT_EXCUSED' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {STATUS_LABEL[status] || status}
          </span>
        )}
        {!open && (
          <button
            onClick={() => {
              setNewStatus(status);
              setNewDate(date);
              setError('');
              setOpen(true);
            }}
            className="ml-2 text-[11px] font-bold text-indigo-600 hover:underline"
          >
            Sửa
          </button>
        )}
      </span>

      {open && (
        <div className="mt-1.5 mb-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={selectCls}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={selectCls} />
          </div>
          <p className="text-[10px] text-slate-500">
            Đổi sang &quot;Có mặt&quot; sẽ trừ 1 buổi, đổi từ &quot;Có mặt&quot; sang vắng sẽ hoàn lại 1 buổi cho học viên.
          </p>
          {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={() => setOpen(false)} className="px-2.5 py-1 text-[11px] font-bold text-slate-500">
              Hủy
            </button>
            <button
              onClick={remove}
              disabled={loading}
              className="ml-auto px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:underline disabled:opacity-50"
            >
              Xóa điểm danh này
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
