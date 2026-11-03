import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

// Thêm mới / cập nhật đơn giá (cùng phạm vi + loại lớp + số HV thì ghi đè)
export async function POST(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });

    const body = await req.json();
    const classType = body.classType === 'GROUP' ? 'GROUP' : body.classType === 'INDIVIDUAL' ? 'INDIVIDUAL' : null;
    if (!classType) return NextResponse.json({ error: 'Loại lớp không hợp lệ' }, { status: 400 });

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) {
      return NextResponse.json({ error: 'Đơn giá không hợp lệ' }, { status: 400 });
    }

    const groupSize = classType === 'GROUP' ? Number(body.groupSize) : 0;
    if (classType === 'GROUP' && (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 30)) {
      return NextResponse.json({ error: 'Số học viên của lớp nhóm phải từ 1 đến 30' }, { status: 400 });
    }

    const teacherId: string | null = body.teacherId ? String(body.teacherId) : null;
    const subject: string | null = body.subject ? String(body.subject).trim() : null;

    if (teacherId) {
      const t = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!t) return NextResponse.json({ error: 'Không tìm thấy giáo viên' }, { status: 404 });
    }

    const existing = await prisma.teacherPayRate.findFirst({
      where: { teacherId, subject, classType, groupSize },
    });
    const rate = existing
      ? await prisma.teacherPayRate.update({ where: { id: existing.id }, data: { amount } })
      : await prisma.teacherPayRate.create({ data: { teacherId, subject, classType, groupSize, amount } });

    return NextResponse.json({ success: true, id: rate.id });
  } catch (error: any) {
    console.error('Pay rate POST Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireRole(['ADMIN']);
    if (!user) return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã đơn giá' }, { status: 400 });

    await prisma.teacherPayRate.deleteMany({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pay rate DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
