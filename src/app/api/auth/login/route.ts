import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = 'huynhtrongtam1106@gmail.com';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập địa chỉ email.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cookieStore = await cookies();

    // 1. Kiểm tra nếu là Chủ sở hữu (Admin)
    if (cleanEmail === ADMIN_EMAIL) {
      let adminUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      // Tự động khởi tạo tài khoản Admin trong DB nếu chưa có
      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: 'Chủ Trung Tâm (Admin)',
            role: 'ADMIN',
          },
        });
      }

      cookieStore.set('friend_user_role', 'ADMIN', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      cookieStore.set('friend_user_email', cleanEmail, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      cookieStore.delete('friend_teacher_id');

      return NextResponse.json({
        success: true,
        role: 'ADMIN',
        redirectTo: '/admin/dashboard',
      });
    }

    // 2. Kiểm tra nếu là Giáo viên
    const teacherUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { teacher: true },
    });

    if (teacherUser && teacherUser.teacher) {
      cookieStore.set('friend_user_role', 'TEACHER', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      cookieStore.set('friend_teacher_id', teacherUser.teacher.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      cookieStore.set('friend_user_email', cleanEmail, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        role: 'TEACHER',
        redirectTo: '/teacher/attendance',
      });
    }

    return NextResponse.json(
      { error: 'Email chưa được đăng ký trong hệ thống Friend Music!' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
