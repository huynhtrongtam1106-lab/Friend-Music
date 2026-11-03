import { requireRole } from '@/lib/auth';
import { loadLessons } from '@/lib/payroll-data';
import { classLabel, formatDateVN } from '@/lib/payroll';

const STATUS_LABEL: Record<string, string> = {
  ATTENDED: 'Có mặt',
  ABSENT_EXCUSED: 'Vắng có phép',
  ABSENT_UNEXCUSED: 'Vắng không phép',
};

const csv = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

// Xuất báo cáo ra file CSV (mở được bằng Excel)
export async function GET(req: Request) {
  const user = await requireRole(['ADMIN']);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const sp = new URL(req.url).searchParams;
  const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59`) : new Date();
  const teacherId = sp.get('teacherId') || undefined;

  const { lessons } = await loadLessons({ from, to, teacherId });

  const header = ['Giáo viên', 'Ngày', 'Giờ', 'Môn', 'Loại lớp', 'Số HV có mặt', 'Học viên', 'Đơn giá', 'Thành tiền', 'Ghi chú'];
  const lines = [header.map(csv).join(',')];
  for (const l of lessons) {
    const students = l.students
      .map((s) => `${s.name} (${s.code})${s.status !== 'ATTENDED' ? ` - ${STATUS_LABEL[s.status] || s.status}` : ''}`)
      .join('; ');
    const note = !l.paid ? 'Không tính tiền (không có HV có mặt)' : l.rate === null ? 'Chưa có đơn giá' : '';
    lines.push(
      [
        l.teacherName,
        formatDateVN(l.date),
        l.startTime || '',
        l.subject,
        l.classType === 'INDIVIDUAL' ? 'Cá nhân' : classLabel(l),
        l.headcount,
        students,
        l.paid && l.rate !== null ? l.rate : '',
        l.paid ? l.amount : 0,
        note,
      ]
        .map(csv)
        .join(',')
    );
  }

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  return new Response('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bao-cao-diem-danh_${fromStr}_${toStr}.csv"`,
    },
  });
}
