'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Props {
  initialEnrollments: any[];
}

export default function AttendanceClient({ initialEnrollments }: Props) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [activeEnrollmentId, setActiveEnrollmentId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('30 phút/ngày');
  const [evaluation, setEvaluation] = useState('Nắm bài tốt, nhịp chắc chắn.');
  const [teacherNote, setTeacherNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAttendance = async (item: any, status: 'ATTENDED' | 'ABSENT_EXCUSED' | 'ABSENT_UNEXCUSED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: item.id,
          teacherId: item.teacherId,
          status,
          date: new Date().toISOString().split('T')[0],
          assignment,
          exerciseDuration,
          teacherEvaluation: evaluation,
          teacherNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Cập nhật số buổi trực tiếp trên giao diện
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === item.id
            ? {
                ...e,
                remainingSessions: data.remaining,
                attendedSessions: e.attendedSessions + (status !== 'ABSENT_EXCUSED' ? 1 : 0),
              }
            : e
        )
      );

      setActiveEnrollmentId(null);
      setAssignment('');
      setTeacherNote('');
      alert(`🎉 Điểm danh thành công cho học viên ${item.student.fullName}!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          ← Quay lại Trang Chủ
        </Link>
        <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
          {enrollments.length} học viên cần theo dõi
        </span>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          Hiện chưa có học viên nào đang theo học.
        </div>
      ) : (
        enrollments.map((item) => {
          const isOpen = activeEnrollmentId === item.id;
          const isEnding = item.remainingSessions <= 1;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-600 text-xs px-2 py-0.5 bg-indigo-50 rounded-md">
                      {item.student.studentCode}
                    </span>
                    <h2 className="font-bold text-slate-900 text-sm">{item.student.fullName}</h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.pricingPlan.subject} • {item.pricingPlan.packageName}
                  </p>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    isEnding
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  Còn {item.remainingSessions}b
                </span>
              </div>

              {isOpen ? (
                <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bài tập về nhà *</label>
                    <textarea
                      rows={2}
                      placeholder="Nội dung bài tập (trang sách, bài hát, hợp âm, bài tập kỹ thuật)..."
                      value={assignment}
                      onChange={(e) => setAssignment(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Thời lượng tập</label>
                      <input
                        value={exerciseDuration}
                        onChange={(e) => setExerciseDuration(e.target.value)}
                        placeholder="30 phút/ngày"
                        className="w-full p-2 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ghi chú nội bộ GV</label>
                      <input
                        value={teacherNote}
                        onChange={(e) => setTeacherNote(e.target.value)}
                        placeholder="Ghi nhớ riêng..."
                        className="w-full p-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Đánh giá gửi Phụ huynh</label>
                    <input
                      value={evaluation}
                      onChange={(e) => setEvaluation(e.target.value)}
                      placeholder="Nhận xét sự tiến bộ..."
                      className="w-full p-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleAttendance(item, 'ATTENDED')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                    >
                      {loading ? 'Đang lưu...' : '✓ Có mặt (Trừ 1b)'}
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleAttendance(item, 'ABSENT_EXCUSED')}
                      className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-xl hover:bg-amber-100 transition"
                    >
                      Vắng có phép
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveEnrollmentId(null)}
                      className="px-3 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEnrollmentId(item.id);
                      setAssignment('');
                    }}
                    className="flex-1 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
                  >
                    Điểm Danh & Nhập Bài Tập
                  </button>
                  <Link
                    href={`/p/${item.student.accessToken}`}
                    target="_blank"
                    className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition flex items-center"
                  >
                    Sổ ↗
                  </Link>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
