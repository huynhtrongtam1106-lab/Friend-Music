import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { enrollmentId, status, assignment, evaluation, dueDate, grade, note } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Thiếu thông tin đăng ký lớp học' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin học viên' }, { status: 404 });
    }

    let newRemaining = enrollment.remainingSessions;
    let newAttended = enrollment.attendedSessions;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        enrollmentId_date: {
          enrollmentId,
          date: today,
        },
      },
    });

    if (status === 'ATTENDED') {
      if (!existingAttendance) {
        if (enrollment.remainingSessions <= 0) {
          return NextResponse.json({ error: 'Học viên đã hết số buổi trong gói học!' }, { status: 400 });
        }
        newRemaining -= 1;
        newAttended += 1;

        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            remainingSessions: newRemaining,
            attendedSessions: newAttended,
          },
        });
      }
    }

    // Upsert Attendance (Không chứa trường homework)
    const attendanceRecord = await prisma.attendance.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId,
          date: today,
        },
      },
      update: {
        status: status === 'ATTENDED' ? 'ATTENDED' : 'ABSENT_EXCUSED',
      },
      create: {
        status: status === 'ATTENDED' ? 'ATTENDED' : 'ABSENT_EXCUSED',
        date: today,
        enrollment: { connect: { id: enrollmentId } },
        student: { connect: { id: enrollment.studentId } },
        teacher: { connect: { id: enrollment.teacherId } },
      },
    });

    let assignmentStatus = 'Đang làm';
    if (dueDate) {
      const now = new Date();
      const due = new Date(dueDate);
      if (now > due) {
        assignmentStatus = 'Trễ hạn';
      }
    }

    // Upsert SessionLog lưu bài tập và nhận xét
    await prisma.sessionLog.upsert({
      where: {
        attendanceId: attendanceRecord.id,
      },
      update: {
        assignment: assignment || null,
        teacherEvaluation: evaluation || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: assignmentStatus,
        grade: grade || 'Chưa kiểm tra',
        note: note || null,
      },
      create: {
        studentId: enrollment.studentId,
        attendanceId: attendanceRecord.id,
        lessonDate: new Date(),
        assignment: assignment || null,
        teacherEvaluation: evaluation || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: assignmentStatus,
        grade: grade || 'Chưa kiểm tra',
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, remaining: newRemaining });
  } catch (error: any) {
    console.error('Attendance API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
