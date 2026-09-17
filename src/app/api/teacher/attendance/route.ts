import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { enrollmentId, status, assignment, evaluation } = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { student: true },
      });

      if (!enrollment) throw new Error('Không tìm thấy thông tin gói học');
      if (enrollment.remainingSessions <= 0) throw new Error('Học viên đã hết buổi học');

      const attendance = await tx.attendance.create({
        data: {
          date: new Date(),
          enrollmentId,
          studentId: enrollment.studentId,
          teacherId: enrollment.teacherId,
          status: status || 'ATTENDED',
        },
      });

      await tx.sessionLog.create({
        data: {
          attendanceId: attendance.id,
          studentId: enrollment.studentId,
          lessonDate: new Date(),
          assignment: assignment || 'Luyện tập theo bài giảng',
          exerciseDuration: '30 phút/ngày',
          teacherEvaluation: evaluation || 'Hoàn thành tốt buổi học',
        },
      });

      const shouldDeduct = status === 'ATTENDED' || status === 'ABSENT_UNEXCUSED';
      const updatedEnrollment = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          attendedSessions: shouldDeduct ? { increment: 1 } : undefined,
          remainingSessions: shouldDeduct ? { decrement: 1 } : undefined,
        },
      });

      return { attendance, updatedEnrollment };
    });

    return NextResponse.json({
      success: true,
      remaining: result.updatedEnrollment.remainingSessions,
      needsRenewal: result.updatedEnrollment.remainingSessions <= 1,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi điểm danh' }, { status: 400 });
  }
}
