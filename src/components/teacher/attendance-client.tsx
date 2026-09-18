'use client';

import React, { useState } from 'react';

export default function AttendanceClient({ initialEnrollments }: { initialEnrollments: any[] }) {
  const [list, setList] = useState(initialEnrollments);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState('');
  const [evaluation, setEvaluation] = useState('Nắm nhịp tốt, bài tập về nhà luyện thêm gam.');
  const [dueDate, setDueDate] = useState('');
  const [grade, setGrade] = useState('Chưa kiểm tra'); // Mặc định là chưa kiểm tra khi mới giao bài
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Chưa có';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleMark = async (enrollmentId: string, status: 'ATTENDED' | 'ABSENT_EXCUSED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enrollmentId, 
          status, 
          assignment, 
          evaluation, 
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          grade,
          note
        }),
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
        setDueDate('');
        setNote('');
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block font-semibold">Trạng thái</span>
              <span className="font-bold text-slate-700">
                {item.student.status === 'ACTIVE' ? '🟢 Đang học' : '⚪ Tạm ngưng'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Thời gian (Đã học)</span>
              <span className="font-bold text-slate-700">{item.attendedSessions} buổi</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Ngày bắt đầu</span>
              <span className="font-bold text-slate-700">{formatDate(item.startDate)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Ngày đến hạn</span>
              <span className="font-bold text-rose-600">{formatDate(item.renewalDate)}</span>
            </div>
          </div>

          {activeId === item.id ? (
            <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bài tập về nhà:</label>
                <input
                  type="text"
                  placeholder="VD: Chạy ngón ngón 1-4, bài Scarborough Fair..."
                  value={assignment}
                  onChange={(e) => setAssignment(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">⏰ Ngày đến hạn (Deadline):</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">📊 Kết quả kiểm tra:</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-600"
                  >
                    <option value="Chưa kiểm tra">Chưa kiểm tra (Đang làm)</option>
                    <option value="Đạt">Đạt</option>
                    <option value="Không đạt">Không đạt</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">📌 Trạng thái bài tập:</label>
                  <div className="p-2 bg-slate-100 rounded-xl font-bold text-slate-600 text-center">
                    Tự động tính theo hạn
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhận xét buổi học gửi phụ huynh:</label>
                <textarea
                  placeholder="Nhận xét chi tiết..."
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú riêng của GV:</label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={loading}
                  onClick={() => handleMark(item.id, 'ATTENDED')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  ✓ Có mặt & Lưu bài tập
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleMark(item.id, 'ABSENT_EXCUSED')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
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
              Điểm danh & Giao bài tập ↗
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
