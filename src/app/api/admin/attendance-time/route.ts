import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

// Admin sửa giờ học của 1 buổi (áp dụng cho tất cả học viên trong buổi đó)
export async function PATCH(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });

    const { attendanceIds, startTime } = await req.json();
    if (!Array.isArray(attendanceIds) || attendanceIds.length === 0 || attendanceIds.length > 100) {
      return NextResponse.json({ error: 'Thiếu danh sách điểm danh' }, { status: 400 });
    }
    if (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return NextResponse.json({ error: 'Giờ học không hợp lệ (định dạng HH:MM)' }, { status: 400 });
    }

    await prisma.attendance.updateMany({
      where: { id: { in: attendanceIds.map(String) } },
      data: { startTime: startTime || null },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Attendance time PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
