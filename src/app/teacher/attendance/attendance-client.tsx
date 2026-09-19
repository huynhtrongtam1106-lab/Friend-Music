'use client';

import React, { useState } from 'react';

export default function AttendanceClient({ 
  teacher, 
  initialEnrollments, 
  isAdmin 
}: { 
  teacher: any; 
  initialEnrollments: any[]; 
  isAdmin: boolean; 
}) {
  const [list, setList] = useState(initialEnrollments);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // State quản lý thông tin nhập liệu điểm danh
  const [assignment, setAssignment] = useState('');
  const [evaluation, setEvaluation] = useState('Nắm nhịp tốt, bài tập về nhà luyện thêm gam.');
  const [dueDate, setDueDate] = useState('');
  const [grade, setGrade] = useState('Đạt');
  const [loading, setLoading] = useState(false);

  // Hàm định dạng ngày tháng sang kiểu Việt Nam (DD/MM/YYYY)
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
          dueDate,
          grade
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
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header thông tin giáo viên */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900">Cổng Điểm Danh: {teacher.user.name}</h1>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md">
                  XEM TỪ ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Môn dạy: {teacher.specializations.join(', ')}</p>
          </div>
          {isAdmin && (
            <a
              href="/admin/dashboard"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              ← Quay lại Dashboard
            </a>
          )}
        </div>

        {/* Danh sách học viên */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-sm">Danh sách học viên phụ trách</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {list.length} học viên
            </span>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-bold text-slate-700">Chưa có học viên nào được phân công</p>
              <p className="text-xs text-slate-400">Vui lòng tạo học viên mới từ trang quản trị để hiển thị danh sách lớp.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((item) => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-slate-900">{item.student.fullName}</span>
                        <span className="text-[11px] font-mono bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                          {item.student.studentCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        [{item.pricingPlan.subject}] {item.pricingPlan.packageName}
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

                  {/* Bảng thông tin chi tiết: Trạng thái, Thời gian (Đã học), Ngày bắt đầu, Ngày đến hạn */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 bg-white rounded-xl border border-slate-200 text-[11px]">
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
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bài tập về nhà</label>
                        <input
                          type="text"
                          placeholder="VD: Chạy ngón 1-4, tập bài nhạc..."
                          value={assignment}
                          onChange={(e) => setAssignment(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Hạn nộp bài</label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Kết quả / Điểm số</label>
                          <select
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Đạt">Đạt</option>
                            <option value="Tốt">Tốt</option>
                            <option value="Cần cố gắng">Cần cố gắng</option>
                            <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhận xét buổi học gửi phụ huynh</label>
                        <textarea
                          placeholder="Nhận xét chi tiết tiến độ học tập..."
                          value={evaluation}
                          onChange={(e) => setEvaluation(e.target.value)}
                          rows={2}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={loading}
                          onClick={() => handleMark(item.id, 'ATTENDED')}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          ✓ Có mặt & Lưu bài tập
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleMark(item.id, 'ABSENT_EXCUSED')}
                          className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Vắng phép
                        </button>
                        <button
                          onClick={() => setActiveId(null)}
                          className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveId(item.id)}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Điểm danh & Nhập bài tập về nhà ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}