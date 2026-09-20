import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, specializations } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ Tên và Email giáo viên.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email đăng nhập này đã tồn tại trong hệ thống.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          phone: phone || null,
          role: 'TEACHER',
        },
      });

      const newTeacher = await tx.teacher.create({
        data: {
          userId: newUser.id,
          specializations: specializations || ['Guitar'],
        },
      });

      return { newUser, newTeacher };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server khi tạo giáo viên.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });
    }

    const body = await req.json();
    // Hỗ trợ lấy id từ cả body.id hoặc body.teacherId
    const id = body.id || body.teacherId;
    const { name, email, phone, specializations, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID giáo viên cần cập nhật.' }, { status: 400 });
    }

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!teacher) throw new Error('Không tìm thấy giáo viên trong hệ thống.');

      const userUpdateData: any = {
        name,
        email,
        phone: phone || null,
      };

      // Nếu Admin có nhập mật khẩu mới, tiến hành mã hóa và cập nhật passwordHash
      if (password && password.trim()) {
        userUpdateData.passwordHash = await bcrypt.hash(password, 10);
      }

      await tx.user.update({
        where: { id: teacher.userId },
        data: userUpdateData,
      });

      const result = await tx.teacher.update({
        where: { id },
        data: {
          specializations: specializations || [],
        },
        include: { user: true }
      });

      return result;
    });

    return NextResponse.json({ success: true, data: updatedTeacher });
  } catch (error: any) {
    console.error('Update Teacher Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server khi cập nhật giáo viên.' }, { status: 500 });
  }
}