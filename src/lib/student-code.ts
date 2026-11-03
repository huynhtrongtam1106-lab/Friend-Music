// Tiện ích cho Mã Học Viên: so sánh tên, gợi ý mã trống kế tiếp, lỗi trùng mã
import type { PrismaClient } from '@prisma/client';

export class StudentCodeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentCodeConflictError';
  }
}

// Chuẩn hóa tên để so sánh: bỏ khoảng trắng thừa, không phân biệt hoa thường
export function normalizeName(name: string | null | undefined) {
  return (name || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Gợi ý mã trống kế tiếp theo phần chữ của mã, ví dụ "G" hoặc "G01" -> "G05" nếu đã có G01..G04
export async function suggestNextCode(db: Pick<PrismaClient, 'student'>, code: string) {
  const prefix = (code.match(/^[A-Z]+/) || [''])[0];
  if (!prefix) return null;
  const rows = await db.student.findMany({
    where: { studentCode: { startsWith: prefix } },
    select: { studentCode: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = r.studentCode.match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

// Mã đã có người dùng với tên khác -> báo lỗi rõ ràng, tuyệt đối không ghi đè hồ sơ cũ
export async function assertCodeNotTakenByOther(
  db: Pick<PrismaClient, 'student'>,
  existing: { studentCode: string; fullName: string },
  newName: string
) {
  if (normalizeName(existing.fullName) === normalizeName(newName)) return;
  const suggestion = await suggestNextCode(db, existing.studentCode);
  throw new StudentCodeConflictError(
    `Mã "${existing.studentCode}" đang thuộc về học viên "${existing.fullName}". ` +
      `Mỗi học viên cần một mã riêng${suggestion ? ` (gợi ý: ${suggestion})` : ''}. ` +
      `Nếu muốn đổi tên học viên cũ, hãy dùng chức năng Sửa Học Viên.`
  );
}
