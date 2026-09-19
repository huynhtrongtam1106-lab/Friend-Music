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

    // 1. Kiểm tra gói học tồn tại
    const plan = await prisma.pricingPlan.findUnique({ where: { id: pricingPlanId } });
    if (!plan) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin gói học phí!' }, { status: 404 });
    }

    // 2. Sử dụng Transaction để kiểm soát tuyệt đối, chống tạo trùng mã
    const result = await prisma.$transaction(async (tx) => {
      // Tìm xem học viên với mã này đã tồn tại trong DB chưa (kể cả đã bị xóa mềm)
      let student = await tx.student.findFirst({
        where: { studentCode: code },
      });

      if (student) {
        // NẾU ĐÃ CÓ: Cập nhật đè vào chính bản ghi cũ đó (Hồi sinh học viên)
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
        // NẾU CHƯA CÓ: Tạo mới hoàn toàn
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

      // Tạo mới một Enrollment (đăng ký gói học) gắn với học viên này
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
    console.error('Add/Update student error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}