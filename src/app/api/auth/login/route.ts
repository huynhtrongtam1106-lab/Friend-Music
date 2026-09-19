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
    cookieStore.set('friend_user_role', user.role || 'ADMIN', { path: '/', maxAge: 604800 });
    cookieStore.set('auth_session', 'true', { path: '/', maxAge: 604800 });
    cookieStore.set('userId', user.id, { path: '/', maxAge: 604800 });
    
    // Giữ nguyên cookie cũ và bổ sung thêm 'friend_teacher_id' để tương thích tuyệt đối với trang attendance
    if (teacherId) {
      cookieStore.set('teacherId', teacherId, { path: '/', maxAge: 604800 });
      cookieStore.set('friend_teacher_id', teacherId, { path: '/', maxAge: 604800 });
    }

    const redirectTo = user.role === 'TEACHER' ? '/teacher/attendance' : '/admin/dashboard';

    return NextResponse.json({ success: true, redirectTo, role: user.role });

  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
