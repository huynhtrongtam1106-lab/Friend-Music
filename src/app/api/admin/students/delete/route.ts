import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { studentId, studentCodes } = await req.json();

    // 1. Xóa theo danh sách mã HV (nhập dạng: P01, D01, K02...)
    if (studentCodes && Array.isArray(studentCodes) && studentCodes.length > 0) {
      const formattedCodes = studentCodes.map((c: string) => c.trim().toUpperCase());
      
      const deleted = await prisma.student.updateMany({
        where: { studentCode: { in: formattedCodes } },
        data: {
          status: 'DROPPED',
          deletedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã xóa/chuyển trạng thái nghỉ học cho ${deleted.count} học viên: ${formattedCodes.join(', ')}`,
      });
    }

    // 2. Xóa theo ID từng học viên cụ thể
    if (studentId) {
      const student = await prisma.student.update({
        where: { id: studentId },
        data: {
          status: 'DROPPED',
          deletedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã xóa học viên ${student.fullName} (${student.studentCode}) thành công!`,
      });
    }

    return NextResponse.json({ error: 'Thiếu mã học viên hoặc ID cần xóa' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa học viên' }, { status: 500 });
  }
}
