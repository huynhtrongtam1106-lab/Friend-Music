import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AddStudentModal from '@/components/add-student-modal';
import ActionMenu from '@/components/action-menu';
import { DeleteTeacherButton } from '@/components/delete-action-buttons';
import EditTeacherDialog from '@/components/edit-teacher-dialog';
import GroupPaidButton from '@/components/group-paid-button';
import StudentStatusNav from '@/components/student-status-nav';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { needsTuitionReminder, isGroupPlan, getGroupDue, addMonthsStr, formatDayVN, GROUP_REMINDER_DAYS } from '@/lib/tuition';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await requireRole(['ADMIN']);
  if (!user) {
    redirect('/');
  }

  const [rawPlans, teachers, rawEnrollments, pausedCount, droppedCount] = await Promise.all([
    prisma.pricingPlan.findMany({ orderBy: [{ subject: 'asc' }, { numberOfSessions: 'asc' }] }),
    prisma.teacher.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
    prisma.enrollment.findMany({
      where: { student: { status: 'ACTIVE', deletedAt: null } },
      include: {
        student: true,
        pricingPlan: true,
        teacher: { include: { user: true } },
        extraTeachers: { include: { teacher: { include: { user: true } } } },
      },
      orderBy: { remainingSessions: 'asc' },
    }),
    prisma.student.count({ where: { status: 'PAUSED', deletedAt: null } }),
    prisma.student.count({ where: { status: 'DROPPED', deletedAt: null } }),
  ]);

  const plans = rawPlans.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  // Form "Thêm học viên mới" chỉ nên gợi ý các gói đang bật (isActive),
  // còn form "Sửa học viên" vẫn cần thấy đủ mọi gói kể cả gói đã ẩn
  // để không làm mất lựa chọn hiện tại của học viên cũ.
  const activePlans = plans.filter((p) => p.isActive);

  // Xử lý chuyển đổi các trường kiểu Decimal sang Number để tránh lỗi Next.js Client Component
  const enrollments = rawEnrollments.map((e) => ({
    ...e,
    tuitionFee: Number(e.tuitionFee),
    pricingPlan: {
      ...e.pricingPlan,
      price: Number(e.pricingPlan.price),
    },
  }));

  const dueList = enrollments.filter((e) => needsTuitionReminder(e));
  const dueRenewalCount = dueList.length;
  const DUE_PREVIEW = 6; // Dashboard chỉ hiện nhanh số học viên cần chú ý, còn lại xem ở trang riêng
  const duePreview = dueList.slice(0, DUE_PREVIEW);

  // Thống kê số học viên theo môn để bấm vào là mở trang danh sách đã lọc sẵn
  const subjectMap = new Map<string, number>();
  enrollments.forEach((e) => subjectMap.set(e.pricingPlan.subject, (subjectMap.get(e.pricingPlan.subject) || 0) + 1));
  const subjectCounts: [string, number][] = Array.from(subjectMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-50 p-4 sm:p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Admin - Phóng to logo cực đại */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="w-16 h-16 sm:w-64 sm:h-24 relative shrink-0 flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Friend Music School Logo" 
                className="w-full h-full object-contain sm:scale-[2.2]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight break-words">FRIEND MUSIC SCHOOL</h1>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md shrink-0">ADMIN</span>
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-0.5">● Quản lý trung tâm & Toàn quyền hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AddStudentModal plans={activePlans} teachers={teachers} />
            <Link
              href="/admin/attendance-report"
              className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition whitespace-nowrap"
            >
              📋 Báo Cáo Điểm Danh
            </Link>
            <ActionMenu />
            <a
              href="/api/auth/logout"
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition"
            >
              Đăng Xuất
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Học viên đang học</p>
            <p className="text-3xl font-black text-slate-900">{enrollments.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Gói học đang có</p>
            <p className="text-3xl font-black text-indigo-600">{plans.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Giáo viên trung tâm</p>
            <p className="text-3xl font-black text-slate-900">{teachers.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Cần thu học phí tiếp</p>
            <p className="text-3xl font-black text-rose-600">{dueRenewalCount}</p>
            <p className="text-[10px] text-slate-400">Cá nhân ≤ 1 buổi · Nhóm sắp đến hạn</p>
          </div>
        </div>

        {/* Danh Sách Giáo Viên */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Đội Ngũ Giáo Viên & Cổng Điểm Danh Riêng</h2>
              <p className="text-xs text-slate-400">Mỗi giáo viên có một đường link chỉ thấy học viên của chính mình</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {teachers.length} giáo viên
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {teachers.map((t) => {
              const studentCount = enrollments.filter((e) => e.teacherId === t.id || e.extraTeachers.some((x) => x.teacherId === t.id)).length;
              return (
                <div key={t.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 relative flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{t.user.name}</p>
                        <span className="text-[10px] font-mono text-slate-500 break-all">{t.user.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <EditTeacherDialog
                          teacher={{
                            id: t.id,
                            name: t.user.name,
                            email: t.user.email,
                            phone: t.user.phone,
                            specializations: t.specializations,
                          }}
                        />
                        <DeleteTeacherButton teacherId={t.id} teacherName={t.user.name} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.specializations.map((spec) => (
                        <span key={spec} className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] rounded-md">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                      {studentCount} học viên
                    </span>
                    <Link
                      href={`/teacher/attendance?tid=${t.id}`}
                      target="_blank"
                      className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white font-bold text-[10px] rounded-lg transition"
                    >
                      Mở Cổng Dạy ↗
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Học viên: gọn trên Dashboard, danh sách đầy đủ ở trang riêng */}
        <div id="student-list" className="scroll-mt-4 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Học Viên</h2>
              <p className="text-xs text-slate-400">Đồng bộ tức thì giữa Giáo viên, Quản trị và Phụ huynh</p>
            </div>
            <Link
              href="/admin/students/active"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition whitespace-nowrap"
            >
              Xem tất cả {enrollments.length} học viên →
            </Link>
          </div>

          <StudentStatusNav
            counts={{ active: enrollments.length, paused: pausedCount, dropped: droppedCount }}
          />

          {subjectCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Theo môn:</span>
              {subjectCounts.map(([name, count]) => (
                <Link
                  key={name}
                  href={`/admin/students/active?subject=${encodeURIComponent(name)}`}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                >
                  {name} <span className="text-slate-400">{count}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">Cần thu học phí / sắp hết buổi</h3>
              {dueRenewalCount > DUE_PREVIEW && (
                <Link href="/admin/students/active?due=1" className="text-[11px] font-bold text-indigo-600 hover:underline">
                  Xem cả {dueRenewalCount} học viên →
                </Link>
              )}
            </div>

            {duePreview.length === 0 ? (
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                Hiện chưa có học viên nào cần thu học phí.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {duePreview.map((e) => {
                  const group = isGroupPlan(e.pricingPlan);
                  const due = group ? getGroupDue(e.startDate) : null;
                  return (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-white">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {e.student.fullName}{' '}
                          <span className="font-mono text-[10px] text-indigo-600">{e.student.studentCode}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          [{e.pricingPlan.subject}] {e.pricingPlan.packageName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {due ? (
                          <span className="text-[11px] font-bold text-rose-600 whitespace-nowrap">
                            Hạn đóng {formatDayVN(due.dueDate)}
                            {due.daysLeft < 0
                              ? ` (quá ${Math.abs(due.daysLeft)} ngày)`
                              : due.daysLeft === 0
                              ? ' (hôm nay)'
                              : due.daysLeft <= GROUP_REMINDER_DAYS
                              ? ` (còn ${due.daysLeft} ngày)`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Còn {e.remainingSessions} buổi
                          </span>
                        )}
                        {due && (
                          <GroupPaidButton
                            enrollmentId={e.id}
                            studentName={e.student.fullName}
                            nextDueText={formatDayVN(addMonthsStr(due.dueDate, 1))}
                          />
                        )}
                        <Link
                          href={`/admin/students/active?q=${encodeURIComponent(e.student.studentCode)}`}
                          className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          Xem
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}