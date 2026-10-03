import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { addMonthsStr, vnDateString } from '@/lib/tuition';

// Đánh dấu "Đã thu học phí tháng này" cho lớp nhóm:
// dời ngày đóng gần nhất lên đúng 1 tháng (giữ nguyên ngày đóng của chu kỳ).
export async function POST(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const { enrollmentId } = await req.json();
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Thiếu thông tin học viên.' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) {
      return NextResponse.json({ error: 'Không tìm thấy học viên.' }, { status: 404 });
    }

    const newStart = new Date(`${addMonthsStr(vnDateString(enrollment.startDate), 1)}T12:00:00`);

    await prisma.$transaction([
      prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { startDate: newStart, paymentStatus: 'PAID' },
      }),
      prisma.student.update({
        where: { id: enrollment.studentId },
        data: { startDate: newStart },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Group paid error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
