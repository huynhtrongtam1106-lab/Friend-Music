'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import EditStudentModal from '@/components/edit-student-dialog';
import RestoreStudentButton from '@/components/restore-student-button';
import ChangeStatusButton from '@/components/change-status-button';
import GroupPaidButton from '@/components/group-paid-button';
import { isGroupPlan, getGroupDue, addMonthsStr, formatDayVN, needsTuitionReminder, GROUP_REMINDER_DAYS } from '@/lib/tuition';

const PAGE_SIZE = 15; // số học viên mỗi trang
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
  initialQuery = '',
  initialSubject = '',
  initialOnlyDue = false,
}: {
  enrollments: any[];
  plans: any[];
  teachers: any[];
  variant: 'active' | 'status';
  emptyText?: string;
  initialQuery?: string;
  initialSubject?: string;
  initialOnlyDue?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [subject, setSubject] = useState(initialSubject);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [onlyDue, setOnlyDue] = useState(initialOnlyDue);
  const [page, setPage] = useState(1);
  const isActive = variant === 'active';

  // Danh sách môn và giáo viên có trong dữ liệu để làm bộ lọc
  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    enrollments.forEach((e) => map.set(e.pricingPlan.subject, (map.get(e.pricingPlan.subject) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [enrollments]);
  const teacherOptions = useMemo(
    () => Array.from(new Set(enrollments.flatMap((e) => teacherNames(e)))).sort((a, b) => a.localeCompare(b, 'vi')),
    [enrollments]
  );
  const dueCount = useMemo(() => enrollments.filter((e) => needsTuitionReminder(e)).length, [enrollments]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const base = enrollments.filter(
      (e) =>
        (!subject || e.pricingPlan.subject === subject) &&
        (!teacherFilter || teacherNames(e).includes(teacherFilter)) &&
        (!onlyDue || needsTuitionReminder(e))
    );
    if (!q) return base;
    return base.filter((e) =>
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
  }, [enrollments, query, subject, teacherFilter, onlyDue]);

  const hasFilter = !!(query || subject || teacherFilter || onlyDue);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Đổi bộ lọc thì quay về trang 1
  useEffect(() => {
    setPage(1);
  }, [query, subject, teacherFilter, onlyDue]);

  const resetFilters = () => {
    setQuery('');
    setSubject('');
    setTeacherFilter('');
    setOnlyDue(false);
  };

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
      {enrollments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSubject('')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition ${
                !subject ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tất cả môn ({enrollments.length})
            </button>
            {subjects.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setSubject(subject === name ? '' : name)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition ${
                  subject === name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {name} ({count})
              </button>
            ))}
          </div>
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Lọc theo giáo viên"
          >
            <option value="">Tất cả giáo viên</option>
            {teacherOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {isActive && (
            <button
              type="button"
              onClick={() => setOnlyDue(!onlyDue)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition ${
                onlyDue ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
              }`}
            >
              Cần thu học phí ({dueCount})
            </button>
          )}
          {hasFilter && (
            <button type="button" onClick={resetFilters} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline">
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
      {hasFilter && (
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
          <p className="text-sm font-bold text-slate-600">Không có học viên nào khớp bộ lọc hiện tại</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className={`w-full text-left text-xs ${isActive ? 'min-w-[760px]' : 'min-w-[900px]'}`}>
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <th className="py-2.5">Học viên</th>
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
              {pageItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3">
                    <div className="font-bold text-slate-900">{item.student.fullName}</div>
                    <div className="font-mono text-[10px] font-bold text-indigo-600">{item.student.studentCode}</div>
                  </td>
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
                    {isGroupPlan(item.pricingPlan) && (() => {
                      const due = getGroupDue(item.startDate);
                      if (!due) return null;
                      const late = due.daysLeft < 0;
                      const soon = due.daysLeft <= GROUP_REMINDER_DAYS;
                      return (
                        <div
                          className={`mt-1 text-[10px] font-bold ${
                            !isActive ? 'text-slate-500' : soon ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          Hạn đóng: {formatDayVN(due.dueDate)}
                          {isActive && soon && (late ? ` (quá ${Math.abs(due.daysLeft)} ngày)` : due.daysLeft === 0 ? ' (hôm nay)' : ` (còn ${due.daysLeft} ngày)`)}
                        </div>
                      );
                    })()}
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
                      {isActive && isGroupPlan(item.pricingPlan) && (() => {
                        const due = getGroupDue(item.startDate);
                        if (!due || due.daysLeft > GROUP_REMINDER_DAYS) return null;
                        return (
                          <GroupPaidButton
                            enrollmentId={item.id}
                            studentName={item.student.fullName}
                            nextDueText={formatDayVN(addMonthsStr(due.dueDate, 1))}
                          />
                        );
                      })()}
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

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-500">
            Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            <span className="text-[11px] font-bold text-slate-700 px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
