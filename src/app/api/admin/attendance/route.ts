import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const STATUSES = ['ATTENDED', 'ABSENT_EXCUSED', 'ABSENT_UNEXCUSED'] as const;
type Status = (typeof STATUSES)[number];

// Admin sửa 1 lần điểm danh: đổi trạng thái (Có mặt / Vắng có phép / Vắng không phép) và/hoặc đổi ngày.
// Số buổi của học viên được cộng/trừ lại tự động cho khớp.
export async function PATCH(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Chỉ tài khoản Admin mới được sửa điểm danh.' }, { status: 401 });
    }

    const { attendanceId, status, date } = await req.json();
    if (!attendanceId) {
      return NextResponse.json({ error: 'Thiếu mã điểm danh' }, { status: 400 });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Trạng thái điểm danh không hợp lệ' }, { status: 400 });
    }
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const att = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { enrollment: true },
      });
      if (!att) return { error: 'Không tìm thấy bản ghi điểm danh', code: 404 };

      const newStatus: Status = status ?? att.status;
      const wasAttended = att.status === 'ATTENDED';
      const willBeAttended = newStatus === 'ATTENDED';

      let remaining = att.enrollment.remainingSessions;
      let attended = att.enrollment.attendedSessions;

      if (!wasAttended && willBeAttended) {
        if (remaining <= 0) {
          return {
            error: 'Học viên đã hết số buổi trong gói học nên không thể chuyển thành "Có mặt". Hãy đăng ký gói mới trước.',
            code: 400,
          };
        }
        remaining -= 1;
        attended += 1;
      } else if (wasAttended && !willBeAttended) {
        remaining += 1;
        attended = Math.max(0, attended - 1);
      }

      // Đổi ngày: kiểm tra học viên (lớp này) chưa có điểm danh vào ngày mới
      let newDate: Date | undefined;
      if (date !== undefined) {
        newDate = new Date(`${date}T00:00:00.000Z`);
        if (newDate.getTime() !== att.date.getTime()) {
          const clash = await tx.attendance.findUnique({
            where: { enrollmentId_date: { enrollmentId: att.enrollmentId, date: newDate } },
          });
          if (clash) return { error: 'Học viên này đã có điểm danh vào ngày đó rồi.', code: 409 };
        } else {
          newDate = undefined;
        }
      }

      await tx.attendance.update({
        where: { id: att.id },
        data: { status: newStatus, ...(newDate ? { date: newDate } : {}) },
      });
      if (newDate) {
        await tx.sessionLog.updateMany({ where: { attendanceId: att.id }, data: { lessonDate: newDate } });
      }
      if (remaining !== att.enrollment.remainingSessions) {
        await tx.enrollment.update({
          where: { id: att.enrollmentId },
          data: { remainingSessions: remaining, attendedSessions: attended },
        });
      }
      return { success: true, remaining };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.code });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin attendance PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

// Admin xóa hẳn 1 lần điểm danh (ví dụ điểm danh nhầm học viên). Nếu buổi đó đang là "Có mặt" thì hoàn lại 1 buổi.
// Bài tập và nhận xét gắn với buổi đó cũng bị xóa theo.
export async function DELETE(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Chỉ tài khoản Admin mới được xóa điểm danh.' }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã điểm danh' }, { status: 400 });

    const found = await prisma.$transaction(async (tx) => {
      const att = await tx.attendance.findUnique({ where: { id }, include: { enrollment: true } });
      if (!att) return false;

      if (att.status === 'ATTENDED') {
        await tx.enrollment.update({
          where: { id: att.enrollmentId },
          data: {
            remainingSessions: att.enrollment.remainingSessions + 1,
            attendedSessions: Math.max(0, att.enrollment.attendedSessions - 1),
          },
        });
      }
      await tx.attendance.delete({ where: { id } });
      return true;
    });

    if (!found) return NextResponse.json({ error: 'Không tìm thấy bản ghi điểm danh' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin attendance DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
