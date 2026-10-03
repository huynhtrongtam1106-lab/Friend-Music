import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AddStudentModal from '@/components/add-student-modal';
import ActionMenu from '@/components/action-menu';
import { DeleteTeacherButton } from '@/components/delete-action-buttons';
import EditTeacherDialog from '@/components/edit-teacher-dialog';
import StudentListTable from '@/components/student-list-table';
import StudentStatusNav from '@/components/student-status-nav';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { needsTuitionReminder } from '@/lib/tuition';

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

  const dueRenewalCount = enrollments.filter((e) => needsTuitionReminder(e)).length;

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

        {/* Danh Sách Học Viên */}
        <div id="student-list" className="scroll-mt-4 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Danh Sách Học Viên (Sổ Liên Lạc & Tiến Độ)</h2>
              <p className="text-xs text-slate-400">Đồng bộ tức thì giữa Giáo viên, Quản trị và Phụ huynh</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {enrollments.length} học viên
            </span>
          </div>

          <StudentStatusNav
            current="active"
            counts={{ active: enrollments.length, paused: pausedCount, dropped: droppedCount }}
          />

          <StudentListTable
            variant="active"
            enrollments={enrollments}
            plans={plans}
            teachers={teachers}
            emptyText='Chưa có học viên nào trong hệ thống. Bấm nút "Thêm Học Viên Mới" ở trên để tạo hồ sơ đầu tiên.'
          />
        </div>
      </div>
    </main>
  );
}