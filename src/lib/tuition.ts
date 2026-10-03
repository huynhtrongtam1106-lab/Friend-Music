// Tiện ích tính hạn đóng học phí. Không import prisma nên dùng được ở cả server lẫn client.

/** Lớp nhóm sắp đến hạn trong vòng bao nhiêu ngày thì bắt đầu nhắc thu học phí */
export const GROUP_REMINDER_DAYS = 3;

const VN_TZ = 'Asia/Ho_Chi_Minh';
const pad = (n: number) => String(n).padStart(2, '0');

/** Ngày dạng YYYY-MM-DD theo giờ Việt Nam */
export function vnDateString(d: Date | string | number = new Date()): string {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: VN_TZ });
}

/** Lớp nhóm: đóng học phí theo tháng (theo ngày đóng của tháng trước), không tính theo buổi */
export function isGroupPlan(plan: { packageName?: string | null; subject?: string | null }): boolean {
  const pkg = (plan.packageName || '').toLowerCase();
  const subject = (plan.subject || '').toLowerCase();
  return pkg.includes('nhóm') || pkg.includes('group') || subject.includes('nhóm');
}

/** Cộng tháng cho chuỗi YYYY-MM-DD, nếu tháng sau không có ngày đó (31/1 -> 28/2) thì lấy ngày cuối tháng */
export function addMonthsStr(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const total = m - 1 + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, lastDay))}`;
}

export function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function formatDayVN(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/** Hạn đóng tiền kế tiếp của lớp nhóm = ngày đóng gần nhất (startDate) + 1 tháng */
export function getGroupDue(startDate: Date | string | null | undefined) {
  if (!startDate) return null;
  const dueDate = addMonthsStr(vnDateString(startDate), 1);
  const daysLeft = daysBetween(vnDateString(), dueDate); // âm = đã quá hạn
  return { dueDate, daysLeft };
}

/**
 * Có cần nhắc thu học phí không?
 * - Lớp cá nhân: còn <= 1 buổi
 * - Lớp nhóm: còn <= GROUP_REMINDER_DAYS ngày nữa tới hạn hoặc đã quá hạn
 */
export function needsTuitionReminder(e: {
  pricingPlan: { packageName?: string | null; subject?: string | null };
  remainingSessions: number;
  startDate?: Date | string | null;
}): boolean {
  if (isGroupPlan(e.pricingPlan)) {
    const due = getGroupDue(e.startDate);
    return !!due && due.daysLeft <= GROUP_REMINDER_DAYS;
  }
  return e.remainingSessions <= 1;
}
