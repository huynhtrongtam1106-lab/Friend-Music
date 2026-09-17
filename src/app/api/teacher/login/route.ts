import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { teacherId } = await req.json();

    if (!teacherId) {
      return NextResponse.json({ error: 'Thiếu ID giáo viên' }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Không tìm thấy giáo viên' }, { status: 404 });
    }

    // Thiết lập cookie định danh giáo viên (thời hạn 30 ngày)
    const cookieStore = await cookies();
    cookieStore.set('friend_teacher_id', teacher.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      teacherName: teacher.user.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
