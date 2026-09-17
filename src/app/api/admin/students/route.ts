import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentCode, fullName, parentPhone, parentEmail, teacherId, pricingPlanId, note } = body;

    if (!studentCode || !fullName || !teacherId || !pricingPlanId) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Mã HV, Tên, Giáo viên và Gói học!' }, { status: 400 });
    }

    const code = studentCode.trim().toUpperCase();

    // 1. Kiểm tra mã học viên trùng
    const existing = await prisma.student.findUnique({ where: { studentCode: code } });
    if (existing) {
      return NextResponse.json({ error: `Mã học viên "${code}" đã tồn tại trên hệ thống!` }, { status: 409 });
    }

    // 2. Lấy thông tin gói giá
    const plan = await prisma.pricingPlan.findUnique({ where: { id: pricingPlanId } });
    if (!plan) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin gói học phí!' }, { status: 404 });
    }

    // 3. Thực thi Transaction tạo Học viên + Gói đăng ký
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          studentCode: code,
          fullName: fullName.trim(),
          parentPhone: parentPhone?.trim() || null,
          parentEmail: parentEmail?.trim() || null,
          note: note?.trim() || null,
          status: 'ACTIVE',
        },
      });

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
      message: `Đã thêm thành công học viên ${result.student.fullName} (${result.student.studentCode})`,
      data: result,
      magicLink: `/p/${result.student.accessToken}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
