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
    const { studentCode, fullName, parentPhone, parentEmail, teacherId, pricingPlanId, note } = body;

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
    const { id, fullName, phone, parentPhone, parentEmail, status, note } = body;

    if (!id || !fullName) {
      return NextResponse.json({ error: 'Thiếu thông tin ID hoặc Họ tên học viên!' }, { status: 400 });
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
        parentEmail: parentEmail?.trim() || null,
        status: status || 'ACTIVE',
        note: note?.trim() || null,
      },
    });

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