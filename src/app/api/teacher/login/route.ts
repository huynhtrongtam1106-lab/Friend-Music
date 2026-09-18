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
      return NextResponse.json({ error: 'Email giáo viên không tồn tại trong hệ thống!' }, { status: 400 });
    }

    let teacherId = user.teacher?.id;
    if (user.role === 'TEACHER' && !teacherId) {
      const newTeacher = await prisma.teacher.create({
        data: { userId: user.id, specializations: ['Guitar'] }
      });
      teacherId = newTeacher.id;
    }

    const cookieStore = await cookies();
    const maxAge = 604800; // 7 ngày

    // Lưu ĐÚNG tên cookie mà trang attendance đang quét
    if (teacherId) {
      cookieStore.set('friend_teacher_id', teacherId, { path: '/', maxAge });
    }
    cookieStore.set('friend_user_role', user.role || 'TEACHER', { path: '/', maxAge });
    cookieStore.set('auth_session', 'true', { path: '/', maxAge });

    return NextResponse.json({ 
      success: true, 
      teacherId,
      redirectTo: '/teacher/attendance'
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
