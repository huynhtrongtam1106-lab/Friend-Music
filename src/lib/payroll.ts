// Logic tính tiền dạy cho giáo viên (thuần tính toán, dùng được ở cả server và client)
import { isGroupPlan } from '@/lib/tuition';

export type ClassType = 'INDIVIDUAL' | 'GROUP';

export type PayRate = {
  id: string;
  teacherId: string | null;
  subject: string | null;
  classType: ClassType;
  groupSize: number;
  amount: number;
};

export type LessonStudent = {
  attendanceId: string;
  studentId: string;
  name: string;
  code: string;
  status: string; // ATTENDED | ABSENT_EXCUSED | ABSENT_UNEXCUSED
};

export type Lesson = {
  key: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // "19:00" (giờ thực tế do giáo viên chọn)
  scheduleHint: string | null; // lịch học cố định (dùng khi chưa có giờ thực tế)
  teacherId: string;
  teacherName: string;
  subject: string;
  classType: ClassType;
  headcount: number; // số học viên CÓ MẶT
  students: LessonStudent[];
  paid: boolean; // buổi có ít nhất 1 học viên có mặt thì mới tính tiền
  rate: number | null; // null = chưa cài đơn giá
  amount: number;
};

const normalize = (t: string | null | undefined) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Độ cụ thể của đơn giá: đơn giá riêng cho giáo viên > riêng cho môn > đơn giá chung
function specificity(r: PayRate) {
  return (r.teacherId ? 2 : 0) + (r.subject ? 1 : 0);
}

// Chọn đơn giá phù hợp nhất cho 1 buổi dạy
export function resolveRate(
  rates: PayRate[],
  teacherId: string,
  subject: string,
  classType: ClassType,
  headcount: number
): number | null {
  const candidates = rates.filter(
    (r) =>
      r.classType === classType &&
      (r.teacherId === null || r.teacherId === teacherId) &&
      (r.subject === null || r.subject === subject)
  );
  if (candidates.length === 0) return null;

  if (classType === 'INDIVIDUAL') {
    return [...candidates].sort((a, b) => specificity(b) - specificity(a))[0].amount;
  }

  // Lớp nhóm: ưu tiên mốc đúng bằng số học viên có mặt, không có thì lấy mốc lớn nhất không vượt quá số học viên
  const exact = candidates.filter((r) => r.groupSize === headcount);
  if (exact.length > 0) return [...exact].sort((a, b) => specificity(b) - specificity(a))[0].amount;

  const lower = candidates.filter((r) => r.groupSize < headcount);
  if (lower.length === 0) return null;
  return [...lower].sort((a, b) => b.groupSize - a.groupSize || specificity(b) - specificity(a))[0].amount;
}

export type AttendanceRow = {
  id: string;
  date: Date;
  status: string;
  startTime: string | null;
  teacherId: string;
  teacher: { user: { name: string } };
  student: { id: string; fullName: string; studentCode: string };
  enrollment: {
    scheduleText: string | null;
    pricingPlan: { subject: string; packageName: string };
  } | null;
};

// Gom các dòng điểm danh (mỗi dòng = 1 học viên) thành các BUỔI DẠY.
// - Lớp cá nhân: mỗi học viên là một buổi.
// - Lớp nhóm: các học viên cùng giáo viên + cùng ngày + cùng môn + cùng giờ học là một buổi.
export function buildLessons(rows: AttendanceRow[], rates: PayRate[]): Lesson[] {
  const map = new Map<string, Lesson>();

  for (const a of rows) {
    const plan = a.enrollment?.pricingPlan;
    const subject = plan?.subject || '—';
    const classType: ClassType = plan && isGroupPlan(plan) ? 'GROUP' : 'INDIVIDUAL';
    const date = a.date.toISOString().slice(0, 10);
    const schedule = a.enrollment?.scheduleText || null;

    const timePart = a.startTime ? `T:${a.startTime}` : `S:${normalize(schedule)}`;
    const key =
      classType === 'GROUP' ? `G|${a.teacherId}|${date}|${normalize(subject)}|${timePart}` : `I|${a.id}`;

    let lesson = map.get(key);
    if (!lesson) {
      lesson = {
        key,
        date,
        startTime: a.startTime,
        scheduleHint: schedule,
        teacherId: a.teacherId,
        teacherName: a.teacher.user.name,
        subject,
        classType,
        headcount: 0,
        students: [],
        paid: false,
        rate: null,
        amount: 0,
      };
      map.set(key, lesson);
    }
    if (!lesson.startTime && a.startTime) lesson.startTime = a.startTime;
    lesson.students.push({
      attendanceId: a.id,
      studentId: a.student.id,
      name: a.student.fullName,
      code: a.student.studentCode,
      status: a.status,
    });
    if (a.status === 'ATTENDED') lesson.headcount += 1;
  }

  const lessons = Array.from(map.values());
  for (const l of lessons) {
    l.paid = l.headcount > 0;
    if (l.paid) {
      l.rate = resolveRate(rates, l.teacherId, l.subject, l.classType, l.headcount);
      l.amount = l.rate ?? 0;
    }
  }

  return lessons.sort(
    (a, b) =>
      a.teacherName.localeCompare(b.teacherName, 'vi') ||
      a.date.localeCompare(b.date) ||
      (a.startTime || '').localeCompare(b.startTime || '')
  );
}

export function classLabel(l: { classType: ClassType; headcount: number }) {
  return l.classType === 'INDIVIDUAL' ? 'Cá nhân' : `Nhóm ${l.headcount} HV`;
}

export function formatMoney(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

export function formatDateVN(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
