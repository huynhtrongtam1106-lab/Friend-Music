'use client';

import React, { useState } from 'react';
import BrandLogo from '@/components/brand-logo';

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

  // Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD) để so với hạn nộp bài
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [loading, setLoading] = useState(false);

  // State sửa bài tập đã giao
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ assignment: '', dueDate: '', status: 'Đang làm', grade: 'Chưa kiểm tra' });

  const toInputDate = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : '');

  // Chỉ được chấm điểm khi bài "Đã xong" hoặc đã tới hạn nộp
  const canGrade = (status: string, due: string) => status === 'Đã xong' || !due || due <= todayStr;

  // Bài "Đang làm" mà quá hạn thì hiển thị là "Trễ hạn"
  const displayStatus = (log: any) =>
    log.status === 'Đang làm' && log.dueDate && toInputDate(log.dueDate) < todayStr ? 'Trễ hạn' : log.status;

  const mergeLog = (studentId: string, log: any) =>
    setList((prev) =>
      prev.map((it) => {
        if (it.student.id !== studentId) return it;
        const logs = it.student.sessionLogs || [];
        const exists = logs.some((l: any) => l.id === log.id);
        const next = exists ? logs.map((l: any) => (l.id === log.id ? { ...l, ...log } : l)) : [log, ...logs];
        return { ...it, student: { ...it.student, sessionLogs: next } };
      })
    );

  const startEdit = (log: any) => {
    setEditLogId(log.id);
    setEditForm({
      assignment: log.assignment || '',
      dueDate: toInputDate(log.dueDate),
      status: displayStatus(log),
      grade: log.grade || 'Chưa kiểm tra',
    });
  };

  const handleSaveLog = async (studentId: string) => {
    if (!editLogId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionLogId: editLogId, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        mergeLog(studentId, data.sessionLog);
        setEditLogId(null);
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

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
          teacherId: teacher?.id,
          status, 
          assignment, 
          evaluation,
          dueDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setList((prev) =>
          prev.map((item) =>
            item.id === enrollmentId
              ? { ...item, remainingSessions: data.remaining, attendedSessions: data.attended }
              : item
          )
        );
        const target = list.find((it) => it.id === enrollmentId);
        if (target && data.sessionLog) mergeLog(target.student.id, data.sessionLog);
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
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BrandLogo className="w-24 sm:w-36 shrink-0" />
          <div className="min-w-0">
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

                  {/* Bài tập đã giao: sửa trạng thái / chấm điểm */}
                  {(item.student.sessionLogs || []).filter((l: any) => l.assignment).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-600">Bài tập đã giao</p>
                      {(item.student.sessionLogs || []).filter((l: any) => l.assignment).map((log: any) => (
                        <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-3 text-[11px] space-y-2">
                          {editLogId === log.id ? (
                            <>
                              <input
                                type="text"
                                value={editForm.assignment}
                                onChange={(e) => setEditForm({ ...editForm, assignment: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="date"
                                  value={editForm.dueDate}
                                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                  className="text-xs p-2 border border-slate-200 rounded-lg"
                                />
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                  className="text-xs p-2 border border-slate-200 rounded-lg"
                                >
                                  <option value="Đang làm">Đang làm</option>
                                  <option value="Đã xong">Đã xong</option>
                                  <option value="Trễ hạn">Trễ hạn</option>
                                </select>
                                <select
                                  value={editForm.grade}
                                  disabled={!canGrade(editForm.status, editForm.dueDate)}
                                  onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                                  className="text-xs p-2 border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                                  <option value="Đạt">Đạt</option>
                                  <option value="Tốt">Tốt</option>
                                  <option value="Cần cố gắng">Cần cố gắng</option>
                                  <option value="Không đạt">Không đạt</option>
                                </select>
                              </div>
                              {!canGrade(editForm.status, editForm.dueDate) && (
                                <p className="text-[10px] text-amber-600">
                                  Chưa tới hạn nộp. Chọn trạng thái “Đã xong” nếu học viên đã hoàn thành sớm để chấm điểm.
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  disabled={loading}
                                  onClick={() => handleSaveLog(item.student.id)}
                                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg cursor-pointer"
                                >
                                  Lưu thay đổi
                                </button>
                                <button
                                  onClick={() => setEditLogId(null)}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-800">{log.assignment}</p>
                                <p className="text-slate-500">
                                  Buổi {formatDate(log.lessonDate)} • Hạn: {formatDate(log.dueDate)} • Điểm: {log.grade || 'Chưa kiểm tra'}
                                </p>
                                <span
                                  className={`inline-block font-bold px-1.5 py-0.5 rounded ${
                                    displayStatus(log) === 'Đã xong'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : displayStatus(log) === 'Trễ hạn'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {displayStatus(log)}
                                </span>
                              </div>
                              <button
                                onClick={() => startEdit(log)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                              >
                                Sửa
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Hạn nộp bài</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Bài mới ở trạng thái “Chưa kiểm tra”. Chấm điểm / đổi trạng thái tại mục “Bài tập đã giao”.
                        </p>
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