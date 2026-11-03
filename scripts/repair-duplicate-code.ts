/**
 * Khôi phục khi nhiều học viên bị thêm chung 1 mã (VD: Hoàng Quân, a, b đều mã "G")
 * và hồ sơ học viên cũ bị ghi đè tên.
 *
 * Cách dùng (chạy trong thư mục gốc dự án):
 *   Bước 1 - xem trước, KHÔNG thay đổi dữ liệu:
 *     npx tsx scripts/repair-duplicate-code.ts --code G --keep-name "Hoàng Quân" --stray-names "a,b"
 *   Bước 2 - khi thấy kế hoạch đúng, chạy thật:
 *     npx tsx scripts/repair-duplicate-code.ts --code G --keep-name "Hoàng Quân" --stray-names "a,b" --apply
 *
 *   --code         Mã bị dùng trùng
 *   --keep-name    Tên đúng của học viên gốc (người có lớp học CŨ NHẤT trong mã đó)
 *   --stray-names  Tên các học viên thêm nhầm, theo THỨ TỰ ĐÃ THÊM (cũ trước, mới sau), cách nhau bằng dấu phẩy
 *   --codes        (tùy chọn) Mã mới cho các học viên thêm nhầm, VD "G02,G03". Bỏ trống thì tự chọn mã trống.
 */
import fs from 'fs';
import path from 'path';

// Tự nạp file .env (nếu có) để kết nối đúng database
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const fmt = (d: Date) => d.toLocaleDateString('vi-VN');

async function main() {
  const code = (arg('code') || '').trim().toUpperCase();
  const keepName = (arg('keep-name') || '').trim();
  const strayNames = (arg('stray-names') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const wantedCodes = (arg('codes') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const apply = process.argv.includes('--apply');

  if (!code || !keepName || strayNames.length === 0) {
    console.log('Thiếu tham số. Xem hướng dẫn ở đầu file scripts/repair-duplicate-code.ts');
    process.exit(1);
  }
  if (wantedCodes.length > 0 && wantedCodes.length !== strayNames.length) {
    console.log('Số mã trong --codes phải bằng số tên trong --stray-names');
    process.exit(1);
  }

  const student = await prisma.student.findUnique({
    where: { studentCode: code },
    include: {
      enrollments: {
        orderBy: { createdAt: 'asc' },
        include: { pricingPlan: true, attendances: { select: { id: true } } },
      },
    },
  });
  if (!student) {
    console.log(`Không tìm thấy học viên có mã ${code}`);
    process.exit(1);
  }

  const enrollments = student.enrollments;
  console.log(`\nHồ sơ mã ${code} hiện đang tên "${student.fullName}", có ${enrollments.length} lớp học:`);
  enrollments.forEach((e, i) =>
    console.log(
      `  ${i + 1}. [${e.pricingPlan.subject}] ${e.pricingPlan.packageName} | tạo ${fmt(e.createdAt)} | bắt đầu ${fmt(e.startDate)} | đã học ${e.attendedSessions} buổi | ${e.attendances.length} lần điểm danh`
    )
  );

  if (enrollments.length !== strayNames.length + 1) {
    console.log(
      `\nDừng lại: cần đúng ${strayNames.length + 1} lớp học (1 của học viên gốc + ${strayNames.length} lớp thêm nhầm) nhưng đang có ${enrollments.length}. Hãy kiểm tra lại tham số.`
    );
    process.exit(1);
  }

  const kept = enrollments[0];
  const strays = enrollments.slice(1);

  // Chọn mã mới cho các học viên thêm nhầm
  const prefix = (code.match(/^[A-Z]+/) || ['X'])[0];
  const existing = await prisma.student.findMany({ where: { studentCode: { startsWith: prefix } }, select: { studentCode: true } });
  const used = new Set<string>(existing.map((s: { studentCode: string }) => s.studentCode));
  let counter = 0;
  for (const s of used) {
    const m = s.match(/(\d+)$/);
    if (m) counter = Math.max(counter, parseInt(m[1], 10));
  }
  const newCodes = strayNames.map((_, i) => {
    if (wantedCodes[i]) return wantedCodes[i];
    counter += 1;
    return `${prefix}${String(counter).padStart(2, '0')}`;
  });
  for (const c of newCodes) {
    if (used.has(c)) {
      console.log(`\nDừng lại: mã ${c} đã tồn tại. Hãy dùng --codes để chọn mã khác.`);
      process.exit(1);
    }
  }

  console.log('\n===== KẾ HOẠCH =====');
  console.log(`GIỮ  : lớp 1 ([${kept.pricingPlan.subject}] ${kept.pricingPlan.packageName}) -> học viên "${keepName}" (mã ${code}), bắt đầu ${fmt(kept.startDate)}`);
  strays.forEach((e, i) =>
    console.log(`TÁCH : lớp ${i + 2} ([${e.pricingPlan.subject}] ${e.pricingPlan.packageName}) -> học viên MỚI "${strayNames[i]}" mã ${newCodes[i]}`)
  );

  if (!apply) {
    console.log('\nĐây mới là bản xem trước, CHƯA thay đổi gì. Nếu kế hoạch đúng, chạy lại lệnh và thêm --apply');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: student.id },
      data: { fullName: keepName, startDate: kept.startDate },
    });

    for (let i = 0; i < strays.length; i++) {
      const e = strays[i];
      const created = await tx.student.create({
        data: { studentCode: newCodes[i], fullName: strayNames[i], status: 'ACTIVE', startDate: e.startDate },
      });
      await tx.enrollment.update({ where: { id: e.id }, data: { studentId: created.id } });
      const attendanceIds = e.attendances.map((a) => a.id);
      if (attendanceIds.length > 0) {
        await tx.attendance.updateMany({ where: { id: { in: attendanceIds } }, data: { studentId: created.id } });
        await tx.sessionLog.updateMany({ where: { attendanceId: { in: attendanceIds } }, data: { studentId: created.id } });
      }
    }
  });

  console.log('\nĐã khôi phục xong. Hãy vào Sửa Học Viên để nhập lại SĐT, email, ghi chú cho các học viên.');
}

main()
  .catch((e) => {
    console.error('Lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
