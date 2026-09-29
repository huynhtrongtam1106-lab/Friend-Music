import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const roleInput = body.role; // 'ADMIN' hoặc 'TEACHER'

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { teacher: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Email này không tồn tại trong hệ thống!' }, { status: 400 });
    }

    // Kiểm tra phân vai trò nếu cần
    if (roleInput && user.role !== roleInput) {
      const roleName = user.role === 'ADMIN' ? 'Quản trị viên' : 'Giáo viên';
      return NextResponse.json({ error: `Tài khoản này thuộc quyền ${roleName}, vui lòng chọn đúng tab đăng nhập!` }, { status: 400 });
    }

    // Kiểm tra mật khẩu
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Tài khoản này chưa được thiết lập mật khẩu. Vui lòng liên hệ Admin.' }, { status: 400 });
    }

    // So sánh mật khẩu (Hỗ trợ cả mật khẩu thường hoặc mã hóa bcrypt)
    let isPasswordValid = false;
    if (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      isPasswordValid = (user.passwordHash === password);
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Mật khẩu không chính xác. Vui lòng thử lại.' }, { status: 400 });
    }

    let teacherId = user.teacher?.id;
    if (user.role === 'TEACHER' && !teacherId) {
      const newTeacher = await prisma.teacher.create({
        data: { userId: user.id, specializations: ['Guitar'] }
      });
      teacherId = newTeacher.id;
    }

    const cookieStore = await cookies();
    const cookieOpts = {
      path: '/',
      maxAge: 604800,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };
    cookieStore.set('friend_user_role', user.role || 'ADMIN', cookieOpts);
    cookieStore.set('auth_session', 'true', cookieOpts);
    cookieStore.set('userId', user.id, cookieOpts);

    // Giữ nguyên cookie cũ và bổ sung thêm 'friend_teacher_id' để tương thích tuyệt đối với trang attendance
    if (teacherId) {
      cookieStore.set('teacherId', teacherId, cookieOpts);
      cookieStore.set('friend_teacher_id', teacherId, cookieOpts);
    }

    const redirectTo = user.role === 'TEACHER' ? '/teacher/attendance' : '/admin/dashboard';

    return NextResponse.json({ success: true, redirectTo, role: user.role });

  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
