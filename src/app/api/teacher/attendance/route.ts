import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const user = await requireRole(['TEACHER', 'ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    const { enrollmentId, status, assignment, evaluation, dueDate, grade, note } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Thiếu thông tin đăng ký lớp học' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { extraTeachers: { select: { teacherId: true } } },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin học viên' }, { status: 404 });
    }

    // Xác định giáo viên đang điểm danh (GV chính hoặc GV phụ của học viên này)
    const cookieStore = await cookies();
    const cookieTeacherId = cookieStore.get('friend_teacher_id')?.value;
    const allowedTeacherIds = [enrollment.teacherId, ...enrollment.extraTeachers.map((x) => x.teacherId)];
    let actingTeacherId = enrollment.teacherId;

    if (user.role === 'TEACHER') {
      if (!cookieTeacherId || !allowedTeacherIds.includes(cookieTeacherId)) {
        return NextResponse.json({ error: 'Học viên này không thuộc lớp của bạn.' }, { status: 403 });
      }
      actingTeacherId = cookieTeacherId;
    } else if (body.teacherId && allowedTeacherIds.includes(body.teacherId)) {
      // Admin điểm danh hộ 1 thầy cụ thể
      actingTeacherId = body.teacherId;
    } else if (cookieTeacherId && allowedTeacherIds.includes(cookieTeacherId)) {
      actingTeacherId = cookieTeacherId;
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
        teacher: { connect: { id: actingTeacherId } },
      },
    });

    // So sánh theo NGÀY (giờ Việt Nam) để không bị lệch múi giờ
    const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const dueDay = dueDate ? String(dueDate).slice(0, 10) : '';

    const existingLog = await prisma.sessionLog.findUnique({
      where: { attendanceId: attendanceRecord.id },
    });

    // Giữ nguyên trạng thái nếu bài đã được đánh dấu "Đã xong"
    let assignmentStatus = 'Đang làm';
    if (existingLog?.status === 'Đã xong') {
      assignmentStatus = 'Đã xong';
    } else if (dueDay && dueDay < todayVN) {
      assignmentStatus = 'Trễ hạn';
    }

    // Điểm: form giao bài mới không gửi điểm => giữ điểm cũ (nếu có), nếu không thì "Chưa kiểm tra".
    // Chưa tới hạn nộp (và chưa "Đã xong") thì không được chấm.
    let finalGrade = grade || existingLog?.grade || 'Chưa kiểm tra';
    if (assignmentStatus !== 'Đã xong' && dueDay && dueDay > todayVN) finalGrade = 'Chưa kiểm tra';

    // Upsert SessionLog lưu bài tập và nhận xét
    const sessionLog = await prisma.sessionLog.upsert({
      where: {
        attendanceId: attendanceRecord.id,
      },
      update: {
        assignment: assignment || null,
        teacherEvaluation: evaluation || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: assignmentStatus,
        grade: finalGrade,
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
        grade: finalGrade,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, remaining: newRemaining, attended: newAttended, sessionLog });
  } catch (error: any) {
    console.error('Attendance API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}


// Sửa bài tập đã giao: đổi nội dung, hạn nộp, trạng thái (Đã xong...), điểm, ghi chú
export async function PATCH(req: Request) {
  try {
    const user = await requireRole(['TEACHER', 'ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const { sessionLogId, assignment, dueDate, status, grade, note } = await req.json();
    if (!sessionLogId) {
      return NextResponse.json({ error: 'Thiếu mã bài tập' }, { status: 400 });
    }

    const log = await prisma.sessionLog.findUnique({
      where: { id: sessionLogId },
      include: {
        attendance: {
          include: { enrollment: { include: { extraTeachers: { select: { teacherId: true } } } } },
        },
      },
    });
    if (!log) {
      return NextResponse.json({ error: 'Không tìm thấy bài tập' }, { status: 404 });
    }

    // Giáo viên chỉ sửa được bài của lớp mình (GV chính hoặc GV phụ). Admin sửa được tất cả.
    if (user.role === 'TEACHER') {
      const cookieStore = await cookies();
      const cookieTeacherId = cookieStore.get('friend_teacher_id')?.value;
      const enr = log.attendance.enrollment;
      const allowed = [enr.teacherId, ...enr.extraTeachers.map((x) => x.teacherId)];
      if (!cookieTeacherId || !allowed.includes(cookieTeacherId)) {
        return NextResponse.json({ error: 'Bạn không có quyền sửa bài tập này.' }, { status: 403 });
      }
    }

    const ALLOWED_STATUS = ['Đang làm', 'Đã xong', 'Trễ hạn'];
    if (status && !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    // Không cho chấm điểm khi chưa tới hạn nộp và bài chưa "Đã xong"
    const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const effStatus = status || log.status;
    const effDue =
      dueDate !== undefined ? (dueDate ? String(dueDate).slice(0, 10) : '') : log.dueDate ? log.dueDate.toISOString().slice(0, 10) : '';
    const effGrade = grade || log.grade || 'Chưa kiểm tra';
    if (effGrade !== 'Chưa kiểm tra' && effStatus !== 'Đã xong' && effDue && effDue > todayVN) {
      return NextResponse.json(
        { error: 'Chưa tới hạn nộp bài. Hãy chọn trạng thái "Đã xong" nếu học viên đã hoàn thành sớm.' },
        { status: 400 }
      );
    }

    const updated = await prisma.sessionLog.update({
      where: { id: sessionLogId },
      data: {
        ...(assignment !== undefined && { assignment: assignment || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status && { status }),
        ...(grade && { grade }),
        ...(note !== undefined && { note: note || null }),
      },
    });

    return NextResponse.json({ success: true, sessionLog: updated });
  } catch (error: any) {
    console.error('Attendance PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
