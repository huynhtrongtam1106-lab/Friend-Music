import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

// GET: Lấy toàn bộ danh sách gói học (kể cả gói đã ẩn), sắp theo môn
export async function GET() {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const plans = await prisma.pricingPlan.findMany({
      orderBy: [{ subject: 'asc' }, { numberOfSessions: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: plans.map((p) => ({ ...p, price: Number(p.price) })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}

// POST: Thêm gói học mới
export async function POST(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, packageName, numberOfSessions, price } = body;

    if (!subject || !packageName || !numberOfSessions || !price) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Môn học, Tên gói, Số buổi và Học phí!' },
        { status: 400 }
      );
    }

    const plan = await prisma.pricingPlan.create({
      data: {
        subject: subject.trim(),
        packageName: packageName.trim(),
        numberOfSessions: Number(numberOfSessions),
        price: Number(price),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm gói học "${plan.packageName}"`,
      data: { ...plan, price: Number(plan.price) },
    });
  } catch (error: any) {
    // Trùng (subject + packageName) do @@unique trong schema
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Môn học này đã có gói học trùng tên rồi!' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}

// PUT: Sửa gói học đã có (đổi tên hiển thị, số buổi, học phí, môn học, ẩn/hiện)
export async function PUT(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, subject, packageName, numberOfSessions, price, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID gói học!' }, { status: 400 });
    }

    const plan = await prisma.pricingPlan.update({
      where: { id },
      data: {
        ...(subject !== undefined ? { subject: subject.trim() } : {}),
        ...(packageName !== undefined ? { packageName: packageName.trim() } : {}),
        ...(numberOfSessions !== undefined ? { numberOfSessions: Number(numberOfSessions) } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật gói học "${plan.packageName}"`,
      data: { ...plan, price: Number(plan.price) },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Môn học này đã có gói học trùng tên rồi!' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}

// DELETE: Xóa gói học (chỉ khi chưa có học viên nào đăng ký gói này)
export async function DELETE(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID gói học!' }, { status: 400 });
    }

    const usageCount = await prisma.enrollment.count({ where: { pricingPlanId: id } });
    if (usageCount > 0) {
      // Đã có học viên dùng gói này -> không xóa cứng, chỉ ẩn đi để không phá dữ liệu lịch sử
      const plan = await prisma.pricingPlan.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: `Gói học đang có ${usageCount} học viên sử dụng nên không thể xóa hẳn — đã ẩn gói này khỏi danh sách chọn mới.`,
        data: { ...plan, price: Number(plan.price) },
      });
    }

    await prisma.pricingPlan.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Đã xóa gói học.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
