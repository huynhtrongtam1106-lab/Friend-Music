import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { enrollmentId, teacherId, date, status, assignment, exerciseDuration, dueDate, teacherEvaluation, teacherNote } = await req.json();

    const lessonDate = new Date(date || new Date().toISOString().split('T')[0]);

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { student: true }
      });

      if (!enrollment) throw new Error('Không tìm thấy thông tin đăng ký gói học.');

      // 1. Kiểm tra xem đã có bản ghi điểm danh trong ngày này chưa
      const existingAttendance = await tx.attendance.findUnique({
        where: {
          enrollmentId_date: {
            enrollmentId: enrollment.id,
            date: lessonDate,
          },
        },
        include: { sessionLog: true }
      });

      let attendance;
      let updatedEnrollment;

      if (existingAttendance) {
        // --- TRƯỜNG HỢP ĐÃ ĐIỂM DANH TRONG NGÀY: Cập nhật lại (Upsert logic) ---
        attendance = await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: { status: status as AttendanceStatus },
        });

        // Cập nhật lại nội dung sổ liên lạc/nhật ký buổi học nếu đã tồn tại
        if (existingAttendance.sessionLog) {
          await tx.sessionLog.update({
            where: { id: existingAttendance.sessionLog.id },
            data: {
              assignment,
              exerciseDuration,
              dueDate: dueDate ? new Date(dueDate) : null,
              teacherEvaluation,
              teacherNote,
            },
          });
        } else {
          await tx.sessionLog.create({
            data: {
              attendanceId: attendance.id,
              studentId: enrollment.studentId,
              lessonDate,
              assignment,
              exerciseDuration,
              dueDate: dueDate ? new Date(dueDate) : null,
              teacherEvaluation,
              teacherNote,
            },
          });
        }

        // Không trừ thêm buổi vì buổi học trong ngày này đã được tính trước đó
        updatedEnrollment = enrollment;

      } else {
        // --- TRƯỜNG HỢP CHƯA ĐIỂM DANH TRONG NGÀY: Tạo mới và trừ buổi ---
        if (enrollment.remainingSessions <= 0) {
          throw new Error(`Học viên ${enrollment.student.fullName} đã hết số buổi của gói.`);
        }

        attendance = await tx.attendance.create({
          data: {
            date: lessonDate,
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            teacherId,
            status: status as AttendanceStatus,
          },
        });

        await tx.sessionLog.create({
          data: {
            attendanceId: attendance.id,
            studentId: enrollment.studentId,
            lessonDate,
            assignment,
            exerciseDuration,
            dueDate: dueDate ? new Date(dueDate) : null,
            teacherEvaluation,
            teacherNote,
          },
        });

        const shouldDeduct = status === 'ATTENDED' || status === 'ABSENT_UNEXCUSED';

        updatedEnrollment = await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            attendedSessions: shouldDeduct ? { increment: 1 } : undefined,
            remainingSessions: shouldDeduct ? { decrement: 1 } : undefined,
          },
        });
      }

      return { attendance, updatedEnrollment };
    });

    return NextResponse.json({
      success: true,
      message: 'Đã lưu điểm danh và nhật ký thành công.',
      remaining: result.updatedEnrollment.remainingSessions,
      needsRenewal: result.updatedEnrollment.remainingSessions <= 1,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi điểm danh.' }, { status: 400 });
  }
}