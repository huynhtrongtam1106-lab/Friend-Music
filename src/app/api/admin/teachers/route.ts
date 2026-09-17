import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { teacherId, name, email, phone, specializations } = body;

    if (!teacherId || !name || !email) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc!' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Không tìm thấy giáo viên!' }, { status: 404 });
    }

    // Kiểm tra email trùng với tài khoản khác
    const duplicateUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: teacher.userId },
      },
    });

    if (duplicateUser) {
      return NextResponse.json({ error: 'Email này đã được sử dụng bởi người dùng khác!' }, { status: 409 });
    }

    // Cập nhật User và Teacher qua Transaction
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
        },
      });

      return tx.teacher.update({
        where: { id: teacherId },
        data: {
          specializations: specializations || [],
        },
        include: { user: true },
      });
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật giáo viên' }, { status: 500 });
  }
}
