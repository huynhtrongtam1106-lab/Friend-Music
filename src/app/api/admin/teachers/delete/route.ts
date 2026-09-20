import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const { teacherId } = await req.json();

    if (!teacherId) {
      return NextResponse.json({ error: 'Thiếu ID giáo viên cần xóa' }, { status: 400 });
    }

    // 1. Kiểm tra giáo viên có học viên đang theo học không
    const activeEnrollments = await prisma.enrollment.count({
      where: {
        teacherId,
        student: { status: 'ACTIVE', deletedAt: null },
      },
    });

    if (activeEnrollments > 0) {
      return NextResponse.json({
        error: `Không thể xóa! Giáo viên này hiện đang phụ trách ${activeEnrollments} học viên đang học. Hãy chuyển lớp cho học viên trước.`,
      }, { status: 400 });
    }

    // 2. Thực hiện xóa liên kết giáo viên và tài khoản người dùng
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { userId: true },
    });

    if (teacher) {
      await prisma.$transaction([
        prisma.attendance.deleteMany({ where: { teacherId } }),
        prisma.enrollment.deleteMany({ where: { teacherId } }),
        prisma.teacher.delete({ where: { id: teacherId } }),
        prisma.user.delete({ where: { id: teacher.userId } }),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa giáo viên thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa giáo viên' }, { status: 500 });
  }
}
