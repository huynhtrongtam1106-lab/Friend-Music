'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import EditStudentModal from '@/components/edit-student-dialog';
import RestoreStudentButton from '@/components/restore-student-button';
import ChangeStatusButton from '@/components/change-status-button';
import ShareLinkBtn from '@/components/ShareLinkBtn';

// Bỏ dấu tiếng Việt + chữ thường để tìm "nguyen" ra được "Nguyễn"
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Đang học', cls: 'bg-emerald-100 text-emerald-800' },
  PAUSED: { label: '⏸️ Bảo lưu', cls: 'bg-amber-100 text-amber-800' },
  DROPPED: { label: '🚪 Thôi học', cls: 'bg-slate-200 text-slate-700' },
};

const teacherNames = (e: any): string[] => [
  e.teacher.user.name,
  ...((e.extraTeachers || []).map((x: any) => x.teacher.user.name)),
];

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();

export default function StudentListTable({
  enrollments,
  plans,
  teachers,
  variant,
  emptyText,
}: {
  enrollments: any[];
  plans: any[];
  teachers: any[];
  variant: 'active' | 'status';
  emptyText?: string;
}) {
  const [query, setQuery] = useState('');
  const isActive = variant === 'active';

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return enrollments;
    return enrollments.filter((e) =>
      normalize(
        [
          e.student.studentCode,
          e.student.fullName,
          e.student.phone,
          e.pricingPlan.subject,
          e.pricingPlan.packageName,
          ...teacherNames(e),
          e.scheduleText,
        ]
          .filter(Boolean)
          .join(' ')
      ).includes(q)
    );
  }, [enrollments, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo mã HV, tên, môn, giáo viên, SĐT, lịch học..."
          className="w-full pl-9 pr-9 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
            title="Xóa bộ lọc"
          >
            ✕
          </button>
        )}
      </div>
      {query && (
        <p className="text-[11px] text-slate-500">
          Tìm thấy <b>{filtered.length}</b> / {enrollments.length} học viên
        </p>
      )}

      {enrollments.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm font-bold text-slate-600">{emptyText ?? 'Chưa có học viên nào.'}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm font-bold text-slate-600">Không có học viên nào khớp &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className={`w-full text-left text-xs ${isActive ? 'min-w-[820px]' : 'min-w-[960px]'}`}>
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <th className="py-2.5">Mã HV</th>
                <th className="py-2.5">Họ và Tên</th>
                <th className="py-2.5">Môn & Gói học</th>
                <th className="py-2.5">Giáo viên</th>
                {!isActive && <th className="py-2.5">Trạng thái</th>}
                {isActive && <th className="py-2.5">Lịch học</th>}
                <th className="py-2.5 text-center">Đã học / Còn lại</th>
                {isActive && <th className="py-2.5 text-right">Học phí</th>}
                <th className="py-2.5 text-center">Sổ Liên Lạc</th>
                <th className="py-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 font-mono font-bold text-indigo-600">{item.student.studentCode}</td>
                  <td className="py-3 font-bold text-slate-900">{item.student.fullName}</td>
                  <td className="py-3 text-slate-600">
                    <span className="font-bold text-slate-800">[{item.pricingPlan.subject}]</span> {item.pricingPlan.packageName}
                  </td>
                  <td className="py-3 font-medium text-slate-700">
                    {teacherNames(item).map((name, i) => (
                      <div key={i} className={i === 0 ? '' : 'text-slate-500'}>
                        {name}
                        {i > 0 && <span className="ml-1 text-[9px] font-bold bg-slate-100 text-slate-500 px-1 rounded">phụ</span>}
                      </div>
                    ))}
                  </td>
                  {!isActive && (
                    <td className="py-3">
                      <span className={`font-bold px-2 py-1 rounded-full text-[11px] whitespace-nowrap ${(STATUS_BADGE[item.student.status] ?? STATUS_BADGE.ACTIVE).cls}`}>
                        {(STATUS_BADGE[item.student.status] ?? STATUS_BADGE.ACTIVE).label}
                      </span>
                    </td>
                  )}
                  {isActive && (
                    <td className="py-3 font-medium text-slate-600">
                      {item.scheduleText ? (
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-800 font-semibold">{item.scheduleText}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 text-center">
                    <span className="font-bold text-slate-900">{item.attendedSessions}</span>
                    <span className="text-slate-400"> / </span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        !isActive
                          ? 'bg-slate-100 text-slate-700'
                          : item.remainingSessions <= 1
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Còn {item.remainingSessions}b
                    </span>
                  </td>
                  {isActive && (
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      {Number(item.tuitionFee).toLocaleString('vi-VN')} đ
                    </td>
                  )}
                  <td className="py-3 text-center">
                    <div className="flex justify-center gap-1.5 items-center">
                      <ShareLinkBtn accessToken={item.student.accessToken} />
                      <Link
                        href={`/p/${item.student.accessToken}`}
                        target="_blank"
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-[11px]"
                        title="Xem trước sổ liên lạc"
                      >
                        👁️
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {!isActive && (
                        <RestoreStudentButton studentId={item.student.id} studentName={item.student.fullName} />
                      )}
                      <EditStudentModal enrollment={item} plans={plans} teachers={teachers} />
                      <ChangeStatusButton
                        studentId={item.student.id}
                        studentName={item.student.fullName}
                        currentStatus={item.student.status}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
