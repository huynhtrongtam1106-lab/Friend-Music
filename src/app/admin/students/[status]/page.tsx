import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import StudentListTable from '@/components/student-list-table';
import StudentStatusNav from '@/components/student-status-nav';

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

  const [rawPlans, teachers, rawEnrollments, activeCount, pausedCount, droppedCount] = await Promise.all([
    prisma.pricingPlan.findMany({ orderBy: [{ subject: 'asc' }, { numberOfSessions: 'asc' }] }),
    prisma.teacher.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
    prisma.enrollment.findMany({
      where: { student: { status: config.value, deletedAt: null } },
      include: {
        student: true,
        pricingPlan: true,
        teacher: { include: { user: true } },
        extraTeachers: { include: { teacher: { include: { user: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.student.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.student.count({ where: { status: 'PAUSED', deletedAt: null } }),
    prisma.student.count({ where: { status: 'DROPPED', deletedAt: null } }),
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

          <StudentStatusNav
            current={status as 'paused' | 'dropped'}
            counts={{ active: activeCount, paused: pausedCount, dropped: droppedCount }}
          />

          <StudentListTable
            variant="status"
            enrollments={enrollments}
            plans={plans}
            teachers={teachers}
            emptyText={config.emptyText}
          />
        </div>
      </div>
    </main>
  );
}
