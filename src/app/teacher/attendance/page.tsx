import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AttendanceClient from '@/components/teacher/attendance-client';
import LogoutButton from '@/components/teacher/logout-button';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
  const cookieStore = await cookies();
  const currentTeacherId = cookieStore.get('friend_teacher_id')?.value;

  // Chưa đăng nhập bằng email -> Chuyển về màn hình đăng nhập
  if (!currentTeacherId) {
    redirect('/teacher/login');
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: currentTeacherId },
    include: { user: true },
  });

  if (!teacher) {
    redirect('/teacher/login');
  }

  // CHỈ LẤY ĐÚNG HỌC VIÊN ĐƯỢC PHÂN CÔNG CHO GIÁO VIÊN ĐÃ ĐĂNG NHẬP
  const rawEnrollments = await prisma.enrollment.findMany({
    where: {
      teacherId: currentTeacherId,
      student: { status: 'ACTIVE', deletedAt: null },
    },
    include: {
      student: true,
      pricingPlan: true,
      teacher: { include: { user: true } },
    },
    orderBy: { remainingSessions: 'asc' },
  });

  const enrollments = rawEnrollments.map((item) => ({
    ...item,
    tuitionFee: Number(item.tuitionFee),
    pricingPlan: {
      ...item.pricingPlan,
      price: Number(item.pricingPlan.price),
    },
    startDate: item.startDate ? item.startDate.toISOString() : null,
    renewalDate: item.renewalDate ? item.renewalDate.toISOString() : null,
  }));

  return (
    <main className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
      <div className="max-w-md mx-auto space-y-4">
        {/* Navigation Bar: Chỉ có nút Đăng Xuất */}
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-slate-400">Friend Music • Cổng Giáo Viên</span>
          <LogoutButton />
        </div>

        {/* Thông tin Giáo Viên đang đăng nhập */}
        <header className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-base font-black text-slate-900">{teacher.user.name}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Email: {teacher.user.email} • Môn: {teacher.specializations.join(', ')}
          </p>
        </header>

        {/* Chỉ hiển thị học viên của chính giáo viên này */}
        <AttendanceClient initialEnrollments={enrollments} />
      </div>
    </main>
  );
}
