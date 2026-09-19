import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { studentId, studentCodes } = await req.json();

    // 1. Xóa vĩnh viễn theo danh sách mã HV
    if (studentCodes && Array.isArray(studentCodes) && studentCodes.length > 0) {
      const formattedCodes = studentCodes.map((c: string) => c.trim().toUpperCase());
      
      const deleted = await prisma.student.deleteMany({
        where: { studentCode: { in: formattedCodes } },
      });

      return NextResponse.json({
        success: true,
        message: `Đã xóa vĩnh viễn ${deleted.count} học viên: ${formattedCodes.join(', ')}`,
      });
    }

    // 2. Xóa vĩnh viễn theo ID cụ thể
    if (studentId) {
      const student = await prisma.student.delete({
        where: { id: studentId },
      });

      return NextResponse.json({
        success: true,
        message: `Đã xóa vĩnh viễn học viên ${student.fullName} (${student.studentCode}) thành công!`,
      });
    }

    return NextResponse.json({ error: 'Thiếu mã học viên hoặc ID cần xóa' }, { status: 400 });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa học viên' }, { status: 500 });
  }
}