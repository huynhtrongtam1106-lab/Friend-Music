import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import PayRatesManager from '@/components/pay-rates-manager';

export const dynamic = 'force-dynamic';

export default async function PayRatesPage() {
  const user = await requireRole(['ADMIN']);
  if (!user) {
    redirect('/');
  }

  const [rates, teachers, plans] = await Promise.all([
    prisma.teacherPayRate.findMany({ include: { teacher: { include: { user: true } } } }),
    prisma.teacher.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
    prisma.pricingPlan.findMany({ select: { subject: true }, distinct: ['subject'], orderBy: { subject: 'asc' } }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">Đơn Giá Dạy Cho Giáo Viên</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cài đơn giá theo loại lớp (cá nhân, nhóm 2 HV, nhóm 3 HV...) để báo cáo điểm danh tự tính tiền
            </p>
          </div>
          <Link
            href="/admin/attendance-report"
            className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition whitespace-nowrap"
          >
            ← Về Báo Cáo Điểm Danh
          </Link>
        </div>

        <PayRatesManager
          rates={rates.map((r) => ({
            id: r.id,
            teacherId: r.teacherId,
            teacherName: r.teacher?.user.name ?? null,
            subject: r.subject,
            classType: r.classType,
            groupSize: r.groupSize,
            amount: Number(r.amount),
          }))}
          teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
          subjects={plans.map((p) => p.subject)}
        />
      </div>
    </main>
  );
}
