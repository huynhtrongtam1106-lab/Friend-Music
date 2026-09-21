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
    const { studentCode, fullName, parentPhone, parentEmail, teacherId, pricingPlanId, note, startDate, scheduleText } = body;

    if (!studentCode || !fullName || !teacherId || !pricingPlanId) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Mã HV, Tên, Giáo viên và Gói học!' }, { status: 400 });
    }

    const code = studentCode.trim().toUpperCase();

    // Parse ngày bắt đầu học an toàn: input dạng "YYYY-MM-DD" (từ <input type="date">).
    // Cố định giờ ở 12:00 trưa để tránh lệch ngày khi chuyển múi giờ (UTC <-> GMT+7).
    const parsedStartDate = startDate ? new Date(`${startDate}T12:00:00`) : new Date();

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
            startDate: parsedStartDate,
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
            startDate: parsedStartDate,
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
          startDate: parsedStartDate,
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

// 2. PUT: Chỉnh sửa / Cập nhật thông tin học viên theo ID
export async function PUT(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      fullName,
      phone,
      parentPhone,
      parentEmail,
      status,
      note,
      enrollmentId,
      teacherId,
      pricingPlanId,
      scheduleText,
      startDate,
    } = body;

    if (!id || !fullName) {
      return NextResponse.json({ error: 'Thiếu thông tin ID hoặc Họ tên học viên!' }, { status: 400 });
    }

    const parsedStartDate = startDate ? new Date(`${startDate}T12:00:00`) : undefined;

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
        parentEmail: parentEmail?.trim() || null,
        status: status || 'ACTIVE',
        note: note?.trim() || null,
        ...(parsedStartDate ? { startDate: parsedStartDate } : {}),
      },
    });

    // Cập nhật thêm Enrollment (giáo viên phụ trách, gói học, lịch học, ngày bắt đầu)
    // — trước đây các trường này được gửi lên từ form nhưng bị bỏ sót, không lưu.
    if (enrollmentId) {
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          ...(teacherId ? { teacherId } : {}),
          ...(pricingPlanId ? { pricingPlanId } : {}),
          ...(scheduleText !== undefined ? { scheduleText: scheduleText?.trim() || null } : {}),
          ...(parsedStartDate ? { startDate: parsedStartDate } : {}),
        },
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