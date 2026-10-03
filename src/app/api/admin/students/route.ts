import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

// 1. POST: Tạo mới hoặc khôi phục học viên (Code gốc của anh)
export async function POST(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    const { studentCode, fullName, parentPhone, parentEmail, teacherId, pricingPlanId, note, scheduleText } = body;

    if (!studentCode || !fullName || !teacherId || !pricingPlanId) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Mã HV, Tên, Giáo viên và Gói học!' }, { status: 400 });
    }

    const code = studentCode.trim().toUpperCase();

    // 1. Kiểm tra gói học tồn tại
    const plan = await prisma.pricingPlan.findUnique({ where: { id: pricingPlanId } });
    if (!plan) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin gói học phí!' }, { status: 404 });
    }

    // 2. Sử dụng Transaction để kiểm soát tuyệt đối, chống tạo trùng mã
    const result = await prisma.$transaction(async (tx) => {
      let student = await tx.student.findFirst({
        where: { studentCode: code },
      });

      if (student) {
        student = await tx.student.update({
          where: { id: student.id },
          data: {
            fullName: fullName.trim(),
            parentPhone: parentPhone?.trim() || null,
            parentEmail: parentEmail?.trim() || null,
            note: note?.trim() || null,
            status: 'ACTIVE',
            deletedAt: null,
          },
        });
      } else {
        student = await tx.student.create({
          data: {
            studentCode: code,
            fullName: fullName.trim(),
            parentPhone: parentPhone?.trim() || null,
            parentEmail: parentEmail?.trim() || null,
            note: note?.trim() || null,
            status: 'ACTIVE',
          },
        });
      }

      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          teacherId,
          pricingPlanId: plan.id,
          totalSessions: plan.numberOfSessions,
          attendedSessions: 0,
          remainingSessions: plan.numberOfSessions,
          tuitionFee: plan.price,
          paymentStatus: 'UNPAID',
          scheduleText: scheduleText?.trim() || null,
        },
        include: {
          pricingPlan: true,
          teacher: { include: { user: true } },
        },
      });

      return { student, enrollment };
    });

    return NextResponse.json({
      success: true,
      message: `Đã lưu thành công học viên ${result.student.fullName} (${result.student.studentCode})`,
      data: result,
      magicLink: `/p/${result.student.accessToken}`,
    });

  } catch (error: any) {
    console.error('Add student error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}

// 2. PUT: Chỉnh sửa / Cập nhật thông tin học viên kèm theo gói học, giáo viên và lịch học
export async function PUT(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    
    // Hướng linh hoạt ID học viên (hỗ trợ cả id hoặc studentId)
    const studentId = body.id || body.studentId;
    const phoneValue = body.phone || body.parentPhone;
    const { fullName, parentEmail, status, note, teacherId, pricingPlanId, scheduleText, enrollmentId, startDate } = body;

    if (!studentId || !fullName) {
      return NextResponse.json({ error: 'Thiếu thông tin ID hoặc Họ tên học viên!' }, { status: 400 });
    }

    // Parse ngày bắt đầu học an toàn: input dạng "YYYY-MM-DD" (từ <input type="date">).
    // Cố định giờ ở 12:00 trưa để tránh lệch ngày khi chuyển múi giờ (UTC <-> GMT+7).
    const parsedStartDate = startDate ? new Date(`${startDate}T12:00:00`) : undefined;

    // 1. Cập nhật thông tin cơ bản trong bảng Student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        fullName: fullName.trim(),
        status: status || 'ACTIVE',
        // Chỉ ghi đè các trường khi client thật sự gửi lên, tránh việc chuyển
        // trạng thái (Bảo lưu/Thôi học/Khôi phục) vô tình xóa SĐT, email, ghi chú.
        ...('phone' in body || 'parentPhone' in body ? { parentPhone: phoneValue?.trim() || null } : {}),
        ...('parentEmail' in body ? { parentEmail: parentEmail?.trim() || null } : {}),
        ...('note' in body ? { note: note?.trim() || null } : {}),
        ...(parsedStartDate ? { startDate: parsedStartDate } : {}),
      },
    });

    // 2. Nếu có enrollmentId, tiến hành cập nhật thông tin học phần (Gói học, Giáo viên, Lịch học, Ngày bắt đầu)
    if (enrollmentId) {
      const updateData: any = {
        scheduleText: scheduleText?.trim() || null,
      };

      if (teacherId) {
        updateData.teacherId = teacherId;
      }

      if (parsedStartDate) {
        updateData.startDate = parsedStartDate;
      }

      // Nếu có thay đổi gói học, tự động cập nhật lại tổng số buổi và học phí chuẩn theo PricingPlan mới
      if (pricingPlanId) {
        const plan = await prisma.pricingPlan.findUnique({
          where: { id: pricingPlanId },
        });

        if (plan) {
          updateData.pricingPlanId = pricingPlanId;
          updateData.totalSessions = plan.numberOfSessions;
          updateData.tuitionFee = plan.price;
        }
      }

      // Đồng bộ số buổi: tổng buổi (theo gói) - số buổi đã học = số buổi còn lại
      const current = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { totalSessions: true, attendedSessions: true },
      });
      if (current) {
        const total = updateData.totalSessions ?? current.totalSessions;
        const hasAttended = body.attendedSessions !== undefined && body.attendedSessions !== null && body.attendedSessions !== '';
        const attended = hasAttended
          ? Math.min(Math.max(parseInt(String(body.attendedSessions), 10) || 0, 0), total)
          : Math.min(current.attendedSessions, total);
        updateData.attendedSessions = attended;
        updateData.remainingSessions = Math.max(total - attended, 0);
      }

      // Nhiều giáo viên: teacherIds[0] = GV chính, phần còn lại = GV phụ
      const teacherIds: string[] = Array.isArray(body.teacherIds)
        ? Array.from(new Set<string>(body.teacherIds.filter(Boolean)))
        : [];
      if (teacherIds.length > 0) {
        updateData.teacherId = teacherIds[0];
      }

      await prisma.$transaction(async (tx) => {
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: updateData,
        });

        if (teacherIds.length > 0) {
          await tx.enrollmentTeacher.deleteMany({ where: { enrollmentId } });
          const extra = teacherIds.slice(1);
          if (extra.length > 0) {
            await tx.enrollmentTeacher.createMany({
              data: extra.map((tid) => ({ enrollmentId, teacherId: tid })),
              skipDuplicates: true,
            });
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin học viên ${updatedStudent.fullName}`,
      data: updatedStudent,
    });

  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}