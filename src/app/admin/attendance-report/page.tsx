import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { loadLessons } from '@/lib/payroll-data';
import { classLabel, formatMoney, formatDateVN, type Lesson } from '@/lib/payroll';
import LessonTimeEditor from '@/components/lesson-time-editor';
import AttendanceEditor from '@/components/attendance-editor';

export const dynamic = 'force-dynamic';

function toDateInputValue(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

const STATUS_LABEL: Record<string, string> = {
  ATTENDED: 'Có mặt',
  ABSENT_EXCUSED: 'Vắng có phép',
  ABSENT_UNEXCUSED: 'Vắng không phép',
};

export default async function AttendanceReportPage(props: {
  searchParams: Promise<{ from?: string; to?: string; teacherId?: string }>;
}) {
  const user = await requireRole(['ADMIN']);
  if (!user) {
    redirect('/');
  }

  const searchParams = await props.searchParams;
  const from = searchParams.from ? new Date(`${searchParams.from}T00:00:00`) : startOfThisMonth();
  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : endOfToday();
  const teacherFilter = searchParams.teacherId || '';

  const teachers = await prisma.teacher.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  const { lessons } = await loadLessons({ from, to, teacherId: teacherFilter || undefined });

  // Gom các buổi dạy theo giáo viên để dễ tính lương
  const grouped = new Map<string, { teacherName: string; lessons: Lesson[] }>();
  for (const l of lessons) {
    if (!grouped.has(l.teacherId)) grouped.set(l.teacherId, { teacherName: l.teacherName, lessons: [] });
    grouped.get(l.teacherId)!.lessons.push(l);
  }

  const missingRateCount = lessons.filter((l) => l.paid && l.rate === null).length;
  const grandTotal = lessons.reduce((sum, l) => sum + (l.paid ? l.amount : 0), 0);
  const exportQuery = new URLSearchParams({
    from: toDateInputValue(from),
    to: toDateInputValue(to),
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
  }).toString();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">Báo Cáo Điểm Danh Theo Giáo Viên</h1>
            <p className="text-xs text-slate-500 mt-0.5">Mỗi dòng là một buổi dạy. Lớp nhóm được gộp theo giờ học, tiền tính theo số học viên có mặt</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/pay-rates"
              className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition whitespace-nowrap"
            >
              💰 Cài đặt đơn giá
            </Link>
            <a
              href={`/api/admin/attendance-report/export?${exportQuery}`}
              className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition whitespace-nowrap"
            >
              ⬇ Xuất Excel (CSV)
            </a>
            <Link
              href="/admin/dashboard"
              className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition whitespace-nowrap"
            >
              ← Quay lại Dashboard
            </Link>
          </div>
        </div>

        {/* Bộ lọc */}
        <form className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Từ ngày</label>
            <input
              type="date"
              name="from"
              defaultValue={toDateInputValue(from)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Đến ngày</label>
            <input
              type="date"
              name="to"
              defaultValue={toDateInputValue(to)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Giáo viên</label>
            <select
              name="teacherId"
              defaultValue={teacherFilter}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tất cả giáo viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.user.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
          >
            Lọc kết quả
          </button>
        </form>

        {missingRateCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
            <span>
              Có <b>{missingRateCount}</b> buổi dạy chưa có đơn giá nên chưa được tính tiền.
            </span>
            <Link href="/admin/pay-rates" className="font-bold underline">
              Cài đặt đơn giá →
            </Link>
          </div>
        )}
        {grouped.size > 0 && (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">
              Tổng cộng {lessons.filter((l) => l.paid).length} buổi dạy tính tiền ({grouped.size} giáo viên)
            </span>
            <span className="text-base font-black text-slate-900">{formatMoney(grandTotal)}</span>
          </div>
        )}

        {/* Bảng kết quả theo từng giáo viên */}
        {grouped.size === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
            <p className="text-sm font-bold text-slate-600">Không có dữ liệu điểm danh trong khoảng thời gian này.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([teacherId, group]) => {
            const paidLessons = group.lessons.filter((l) => l.paid);
            const total = paidLessons.reduce((sum, l) => sum + l.amount, 0);

            // Thống kê theo loại lớp: cá nhân, nhóm 2 HV, nhóm 3 HV...
            const byType = new Map<string, { count: number; amount: number; order: number }>();
            for (const l of paidLessons) {
              const label = classLabel(l);
              const cur = byType.get(label) || { count: 0, amount: 0, order: l.classType === 'INDIVIDUAL' ? 0 : l.headcount };
              cur.count += 1;
              cur.amount += l.amount;
              byType.set(label, cur);
            }
            const typeStats = Array.from(byType.entries()).sort((a, b) => a[1].order - b[1].order);

            return (
              <div key={teacherId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">{group.teacherName}</h2>
                    <p className="text-[11px] text-slate-400">{paidLessons.length} buổi dạy tính tiền</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng tiền dạy</p>
                    <p className="text-lg font-black text-emerald-700">{formatMoney(total)}</p>
                  </div>
                </div>

                {typeStats.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {typeStats.map(([label, st]) => (
                      <span
                        key={label}
                        className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full whitespace-nowrap"
                      >
                        {label}: {st.count} buổi · {formatMoney(st.amount)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                        <th className="py-2 whitespace-nowrap">Ngày</th>
                        <th className="py-2 whitespace-nowrap">Giờ</th>
                        <th className="py-2 whitespace-nowrap">Môn</th>
                        <th className="py-2 whitespace-nowrap">Loại lớp</th>
                        <th className="py-2">Học viên</th>
                        <th className="py-2 whitespace-nowrap text-right">Tiền buổi dạy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.lessons.map((l) => (
                        <tr key={l.key} className={l.paid ? '' : 'opacity-60'}>
                          <td className="py-2 whitespace-nowrap font-mono">{formatDateVN(l.date)}</td>
                          <td className="py-2 whitespace-nowrap">
                            <LessonTimeEditor
                              attendanceIds={l.students.map((s) => s.attendanceId)}
                              startTime={l.startTime}
                              scheduleHint={l.scheduleHint}
                            />
                          </td>
                          <td className="py-2 whitespace-nowrap text-slate-600">{l.subject}</td>
                          <td className="py-2 whitespace-nowrap">
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded ${
                                l.classType === 'INDIVIDUAL' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
                              }`}
                            >
                              {l.paid ? classLabel(l) : l.classType === 'INDIVIDUAL' ? 'Cá nhân' : 'Nhóm'}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex flex-col gap-0.5">
                              {l.students.map((st) => (
                                <AttendanceEditor
                                  key={st.attendanceId}
                                  attendanceId={st.attendanceId}
                                  name={st.name}
                                  code={st.code}
                                  status={st.status}
                                  date={l.date}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-2 whitespace-nowrap text-right font-bold">
                            {!l.paid ? (
                              <span className="text-slate-400 font-normal">Không tính</span>
                            ) : l.rate === null ? (
                              <Link href="/admin/pay-rates" className="text-amber-600 underline">
                                Chưa có đơn giá
                              </Link>
                            ) : (
                              formatMoney(l.amount)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
