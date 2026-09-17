'use client';

import React, { useState } from 'react';

export default function AttendanceClient({ initialEnrollments }: { initialEnrollments: any[] }) {
  const [list, setList] = useState(initialEnrollments);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState('');
  const [evaluation, setEvaluation] = useState('Nắm nhịp tốt, bài tập về nhà luyện thêm gam.');
  const [loading, setLoading] = useState(false);

  const handleMark = async (enrollmentId: string, status: 'ATTENDED' | 'ABSENT_EXCUSED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, status, assignment, evaluation }),
      });
      const data = await res.json();
      if (res.ok) {
        setList((prev) =>
          prev.map((item) =>
            item.id === enrollmentId
              ? { ...item, remainingSessions: data.remaining, attendedSessions: item.attendedSessions + 1 }
              : item
          )
        );
        setActiveId(null);
        setAssignment('');
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (list.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
        <p className="text-sm font-bold text-slate-700">Chưa có học viên nào được phân công</p>
        <p className="text-xs text-slate-400">Vui lòng tạo học viên mới từ trang quản trị để hiển thị danh sách lớp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((item) => (
        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-900">{item.student.fullName}</span>
                <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {item.student.studentCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.pricingPlan.subject} • {item.pricingPlan.packageName}
              </p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                item.remainingSessions <= 1
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
            >
              Còn {item.remainingSessions} buổi
            </span>
          </div>

          {activeId === item.id ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <input
                type="text"
                placeholder="Bài tập về nhà (VD: Chạy ngón ngón 1-4, bài Scarborough Fair)..."
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <textarea
                placeholder="Nhận xét buổi học gửi phụ huynh..."
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() => handleMark(item.id, 'ATTENDED')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  ✓ Có mặt & Trừ 1 buổi
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleMark(item.id, 'ABSENT_EXCUSED')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Vắng phép
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setActiveId(item.id)}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition"
            >
              Điểm danh & Ghi nhận xét
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
