import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import EditStudentModal from '@/components/edit-student-dialog';
import RestoreStudentButton from '@/components/restore-student-button';
import { DeleteStudentButton } from '@/components/delete-action-buttons';
import ShareLinkBtn from '@/components/ShareLinkBtn';

export const dynamic = 'force-dynamic';

// URL "paused" | "dropped" ánh xạ sang giá trị StudentStatus trong Prisma
const STATUS_MAP: Record<string, { value: 'PAUSED' | 'DROPPED'; title: string; badge: string; emptyText: string }> = {
  paused: {
    value: 'PAUSED',
    title: 'Danh Sách Học Viên Đã Bảo Lưu',
    badge: 'bg-amber-100 text-amber-800',
    emptyText: 'Hiện chưa có học viên nào đang bảo lưu.',
  },
  dropped: {
    value: 'DROPPED',
    title: 'Danh Sách Học Viên Đã Thôi Học',
    badge: 'bg-rose-100 text-rose-800',
    emptyText: 'Hiện chưa có học viên nào đã thôi học.',
  },
};

export default async function StudentsByStatusPage(props: {
  params: Promise<{ status: string }>;
}) {
  const user = await requireRole(['ADMIN']);
  if (!user) {
    redirect('/');
  }

  const { status } = await props.params;
  const config = STATUS_MAP[status];
  if (!config) {
    notFound();
  }

  const [rawPlans, teachers, rawEnrollments] = await Promise.all([
    prisma.pricingPlan.findMany({ orderBy: [{ subject: 'asc' }, { numberOfSessions: 'asc' }] }),
    prisma.teacher.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
    prisma.enrollment.findMany({
      where: { student: { status: config.value, deletedAt: null } },
      include: {
        student: true,
        pricingPlan: true,
        teacher: { include: { user: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const plans = rawPlans.map((p) => ({ ...p, price: Number(p.price) }));

  const enrollments = rawEnrollments.map((e) => ({
    ...e,
    tuitionFee: Number(e.tuitionFee),
    pricingPlan: {
      ...e.pricingPlan,
      price: Number(e.pricingPlan.price),
    },
  }));

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-50 p-4 sm:p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">{config.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Học viên ở đây đã bị chuyển trạng thái từ mục Sửa Học Viên nên không còn hiển thị ở Dashboard chính
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition whitespace-nowrap"
          >
            ← Quay lại Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-base">{config.title}</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.badge}`}>
              {enrollments.length} học viên
            </span>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-bold text-slate-600">{config.emptyText}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Mã HV</th>
                    <th className="py-2.5">Họ và Tên</th>
                    <th className="py-2.5">Môn & Gói học</th>
                    <th className="py-2.5">Giáo viên</th>
                    <th className="py-2.5 text-center">Đã học / Còn lại</th>
                    <th className="py-2.5 text-center">Sổ Liên Lạc</th>
                    <th className="py-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 font-mono font-bold text-indigo-600">{item.student.studentCode}</td>
                      <td className="py-3 font-bold text-slate-900">{item.student.fullName}</td>
                      <td className="py-3 text-slate-600">
                        <span className="font-bold text-slate-800">[{item.pricingPlan.subject}]</span> {item.pricingPlan.packageName}
                      </td>
                      <td className="py-3 font-medium text-slate-700">{item.teacher.user.name}</td>
                      <td className="py-3 text-center">
                        <span className="font-bold text-slate-900">{item.attendedSessions}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          Còn {item.remainingSessions}b
                        </span>
                      </td>
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
                          <RestoreStudentButton studentId={item.student.id} studentName={item.student.fullName} />
                          <EditStudentModal enrollment={item} plans={plans} teachers={teachers} />
                          <DeleteStudentButton studentId={item.student.id} studentName={item.student.fullName} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
