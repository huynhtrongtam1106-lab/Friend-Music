// Truy vấn dữ liệu cho báo cáo điểm danh / tính tiền (chỉ dùng phía server)
import { prisma } from '@/lib/prisma';
import { buildLessons, type PayRate } from '@/lib/payroll';

export async function loadPayRates(): Promise<PayRate[]> {
  const rows = await prisma.teacherPayRate.findMany();
  return rows.map((r) => ({
    id: r.id,
    teacherId: r.teacherId,
    subject: r.subject,
    classType: r.classType,
    groupSize: r.groupSize,
    amount: Number(r.amount),
  }));
}

export async function loadLessons(opts: { from: Date; to: Date; teacherId?: string }) {
  const attendances = await prisma.attendance.findMany({
    where: {
      date: { gte: opts.from, lte: opts.to },
      ...(opts.teacherId ? { teacherId: opts.teacherId } : {}),
    },
    include: {
      student: true,
      teacher: { include: { user: true } },
      enrollment: { include: { pricingPlan: true } },
    },
    orderBy: [{ teacherId: 'asc' }, { date: 'asc' }],
  });
  const rates = await loadPayRates();
  return { lessons: buildLessons(attendances as any, rates), rates };
}
