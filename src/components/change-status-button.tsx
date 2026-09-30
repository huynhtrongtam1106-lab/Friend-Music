'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Target = 'PAUSED' | 'DROPPED';

const OPTIONS: { value: Target; icon: string; label: string; hint: string; ring: string }[] = [
  { value: 'PAUSED', icon: '⏸️', label: 'Bảo lưu', hint: 'Tạm nghỉ, có thể quay lại học sau', ring: 'border-amber-400 bg-amber-50' },
  { value: 'DROPPED', icon: '🚪', label: 'Thôi học', hint: 'Đã nghỉ hẳn khỏi trung tâm', ring: 'border-slate-500 bg-slate-100' },
];

/**
 * Nút ✕: KHÔNG xóa vĩnh viễn nữa. Bấm vào sẽ hỏi chuyển học viên sang
 * "Bảo lưu" hay "Thôi học". Học viên vẫn được giữ lại, có thể khôi phục.
 */
export default function ChangeStatusButton({
  studentId,
  studentName,
  currentStatus,
}: {
  studentId: string;
  studentName: string;
  currentStatus: 'ACTIVE' | 'PAUSED' | 'DROPPED';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Target | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setChoice(null);
  };

  const handleConfirm = async () => {
    if (!choice) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, fullName: studentName, status: choice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');
      close();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-slate-400 hover:text-rose-600 font-bold p-1 transition"
        title="Chuyển sang Bảo lưu / Thôi học"
      >
        ✕
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[999] text-left">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Chuyển học viên</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                <b className="text-slate-800">{studentName}</b> sẽ được chuyển sang mục nào?
              </p>
            </div>

            <div className="space-y-2">
              {OPTIONS.map((o) => {
                const isCurrent = o.value === currentStatus;
                const selected = choice === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setChoice(o.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                      isCurrent
                        ? 'opacity-40 cursor-not-allowed border-slate-200'
                        : selected
                        ? o.ring
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{o.icon}</span>
                    <span className="flex-1">
                      <span className="block text-xs font-bold text-slate-900">
                        {o.label} {isCurrent && <span className="font-normal text-slate-500">(hiện tại)</span>}
                      </span>
                      <span className="block text-[11px] text-slate-500">{o.hint}</span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selected ? 'border-indigo-600' : 'border-slate-300'
                      }`}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!choice || loading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition"
              >
                {loading ? 'Đang chuyển...' : 'Xác nhận'}
              </button>
              <button
                type="button"
                onClick={close}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
