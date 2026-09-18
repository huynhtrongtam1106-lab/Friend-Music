import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Vui lòng nhập email.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { teacher: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Email này không tồn tại trong hệ thống!' }, { status: 400 });
    }

    let teacherId = user.teacher?.id;
    if (user.role === 'TEACHER' && !teacherId) {
      const newTeacher = await prisma.teacher.create({
        data: { userId: user.id, specializations: ['Guitar'] }
      });
      teacherId = newTeacher.id;
    }

    const cookieStore = await cookies();
    
    // Đổi tên cookie thành 'friend_user_role' để khớp 100% với file page.tsx của Admin
    cookieStore.set('friend_user_role', user.role || 'ADMIN', { path: '/', maxAge: 604800 });
    cookieStore.set('auth_session', 'true', { path: '/', maxAge: 604800 });
    cookieStore.set('userId', user.id, { path: '/', maxAge: 604800 });
    if (teacherId) {
      cookieStore.set('teacherId', teacherId, { path: '/', maxAge: 604800 });
    }

    const redirectTo = user.role === 'TEACHER' ? '/teacher/attendance' : '/admin/dashboard';

    return NextResponse.json({ success: true, redirectTo });

  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
