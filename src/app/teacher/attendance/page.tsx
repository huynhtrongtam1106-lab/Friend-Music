import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AttendanceClient from './attendance-client';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage(props: {
  searchParams: Promise<{ tid?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireRole(['ADMIN', 'TEACHER']);
  if (!user) {
    redirect('/');
  }
  const role = user.role;
  const cookieStore = await cookies();
  const cookieTeacherId = cookieStore.get('friend_teacher_id')?.value;
  const targetTeacherId = searchParams?.tid;

  let teacherId = targetTeacherId;
  if (role === 'ADMIN') {
    if (!teacherId && cookieTeacherId) {
      teacherId = cookieTeacherId;
    }
  } else if (role === 'TEACHER') {
    teacherId = cookieTeacherId;
  } else {
    redirect('/');
  }

  if (!teacherId) {
    redirect('/');
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-sans">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-rose-600">Không tìm thấy giáo viên trong hệ thống</h1>
          <p className="text-xs text-slate-500">Vui lòng kiểm tra lại đường dẫn hoặc liên hệ Quản trị viên.</p>
        </div>
      </div>
    );
  }

  const rawEnrollments = await prisma.enrollment.findMany({
    where: {
      teacherId: teacher.id,
      student: { status: 'ACTIVE', deletedAt: null },
    },
    include: {
      student: {
        include: {
          sessionLogs: {
            orderBy: { lessonDate: 'desc' },
            take: 10,
          },
        },
      },
      pricingPlan: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const enrollments = rawEnrollments.map((item) => ({
    ...item,
    tuitionFee: Number(item.tuitionFee),
    pricingPlan: {
      ...item.pricingPlan,
      price: Number(item.pricingPlan.price),
    },
  }));

  return (
    <AttendanceClient 
      teacher={teacher} 
      initialEnrollments={enrollments} 
      isAdmin={role === 'ADMIN'} 
    />
  );
}