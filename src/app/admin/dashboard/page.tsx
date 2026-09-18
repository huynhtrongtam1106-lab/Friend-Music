import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AddStudentModal from '@/components/add-student-modal';
import ActionMenu from '@/components/action-menu';
import { DeleteStudentButton, DeleteTeacherButton } from '@/components/delete-action-buttons';
import EditTeacherDialog from '@/components/edit-teacher-dialog';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get('friend_user_role')?.value;

  if (role !== 'ADMIN') {
    redirect('/');
  }

  const [rawPlans, teachers, rawEnrollments] = await Promise.all([
    prisma.pricingPlan.findMany({ orderBy: [{ subject: 'asc' }, { numberOfSessions: 'asc' }] }),
    prisma.teacher.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
    prisma.enrollment.findMany({
      where: { student: { status: 'ACTIVE', deletedAt: null } },
      include: {
        student: true,
        pricingPlan: true,
        teacher: { include: { user: true } },
      },
      orderBy: { remainingSessions: 'asc' },
    }),
  ]);

  const plans = rawPlans.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  const enrollments = rawEnrollments.map((item) => ({
    ...item,
    tuitionFee: Number(item.tuitionFee),
    pricingPlan: {
      ...item.pricingPlan,
      price: Number(item.pricingPlan.price),
    },
  }));

  const dueRenewalCount = enrollments.filter((e) => e.remainingSessions <= 1).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-64 h-24 relative flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Friend Music School Logo" 
                className="w-full h-full object-contain scale-[2.2]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">FRIEND MUSIC SCHOOL</h1>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md">ADMIN</span>
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-0.5">● Quản lý trung tâm & Toàn quyền hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddStudentModal plans={plans} teachers={teachers} />
            <ActionMenu enrollments={enrollments} />
            <a
              href="/api/auth/logout"
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition"
            >
              Đăng Xuất
            </a>
          </div>
        </div>

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
            <p className="text-xs font-semibold text-slate-500">Cần thu phí tiếp (≤ 1b)</p>
            <p className="text-3xl font-black text-rose-600">{dueRenewalCount}</p>
          </div>
        </div>

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
              const studentCount = enrollments.filter((e) => e.teacherId === t.id).length;
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Danh Sách Học Viên (Sổ Liên Lạc & Tiến Độ)</h2>
              <p className="text-xs text-slate-400">Đồng bộ tức thì giữa Giáo viên, Quản trị và Phụ huynh</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {enrollments.length} học viên
            </span>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-bold text-slate-600">Chưa có học viên nào trong hệ thống</p>
              <p className="text-xs text-slate-400">Bấm nút "Thêm Học Viên Mới" ở trên để tạo hồ sơ đầu tiên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Mã HV</th>
                    <th className="py-2.5">Họ và Tên</th>
                    <th className="py-2.5">Môn & Gói học</th>
                    <th className="py-2.5">Giáo viên</th>
                    <th className="py-2.5 text-center">Đã học / Còn lại</th>
                    <th className="py-2.5 text-right">Học phí</th>
                    <th className="py-2.5 text-center">Sổ Liên Lạc</th>
                    <th className="py-2.5 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 font-mono font-bold text-indigo-600">{item.student.studentCode}</td>
                      <td className="py-3 font-bold text-slate-900">{item.student.fullName}</td>
                      <td className="py-3 text-slate-600">
                        <span className="font-bold text-slate-800">[{item.pricingPlan.subject}]</span> {item.pricingPlan.packageName}
                      </td>
                      <td className="py-3 font-medium text-slate-700">{item.teacher.user.name}</td>
                      <td className="py-3 text-center">
                        <span className="font-bold text-slate-900">{item.attendedSessions}</span>
                        <span className="text-slate-400"> / </span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${
                          item.remainingSessions <= 1 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Còn {item.remainingSessions}b
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {Number(item.tuitionFee).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 text-center">
                        <Link
                          href={`/p/${item.student.accessToken}`}
                          target="_blank"
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                        >
                          Mở Sổ Link ↗
                        </Link>
                      </td>
                      <td className="py-3 text-center">
                        <DeleteStudentButton studentId={item.student.id} studentName={item.student.fullName} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
