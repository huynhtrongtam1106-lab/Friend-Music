import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

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

  const attendances = await prisma.attendance.findMany({
    where: {
      date: { gte: from, lte: to },
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    },
    include: {
      student: true,
      teacher: { include: { user: true } },
      enrollment: { include: { pricingPlan: true } },
    },
    orderBy: [{ teacherId: 'asc' }, { date: 'asc' }],
  });

  // Gom nhóm theo giáo viên để dễ tính lương
  const grouped = new Map<string, { teacherName: string; records: typeof attendances }>();
  for (const a of attendances) {
    const key = a.teacherId;
    if (!grouped.has(key)) {
      grouped.set(key, { teacherName: a.teacher.user.name, records: [] as any });
    }
    grouped.get(key)!.records.push(a);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">Báo Cáo Điểm Danh Theo Giáo Viên</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dùng để đối chiếu và tính lương theo số buổi dạy thực tế</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition whitespace-nowrap"
          >
            ← Quay lại Dashboard
          </Link>
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

        {/* Bảng kết quả theo từng giáo viên */}
        {grouped.size === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
            <p className="text-sm font-bold text-slate-600">Không có dữ liệu điểm danh trong khoảng thời gian này.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([teacherId, group]) => {
            const attendedCount = group.records.filter((r) => r.status === 'ATTENDED').length;
            const absentExcused = group.records.filter((r) => r.status === 'ABSENT_EXCUSED').length;
            const absentUnexcused = group.records.filter((r) => r.status === 'ABSENT_UNEXCUSED').length;

            return (
              <div key={teacherId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 text-base">{group.teacherName}</h2>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {attendedCount} buổi có mặt
                    </span>
                    {absentExcused > 0 && (
                      <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {absentExcused} vắng có phép
                      </span>
                    )}
                    {absentUnexcused > 0 && (
                      <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {absentUnexcused} vắng không phép
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[600px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                        <th className="py-2 whitespace-nowrap">Ngày</th>
                        <th className="py-2 whitespace-nowrap">Học viên</th>
                        <th className="py-2 whitespace-nowrap">Môn học</th>
                        <th className="py-2 whitespace-nowrap">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.records.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 whitespace-nowrap font-mono">
                            {new Date(r.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-2 whitespace-nowrap font-bold text-slate-900">
                            {r.student.fullName} <span className="text-slate-400 font-normal">({r.student.studentCode})</span>
                          </td>
                          <td className="py-2 whitespace-nowrap text-slate-600">
                            {r.enrollment?.pricingPlan?.subject || '—'}
                          </td>
                          <td className="py-2 whitespace-nowrap">
                            <span className={`font-bold px-1.5 py-0.5 rounded ${
                              r.status === 'ATTENDED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'ABSENT_EXCUSED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {STATUS_LABEL[r.status] || r.status}
                            </span>
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
