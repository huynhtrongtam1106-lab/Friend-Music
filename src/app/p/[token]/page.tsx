import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ParentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const student = await prisma.student.findUnique({
    where: { accessToken: token, deletedAt: null },
    include: {
      enrollments: {
        include: {
          pricingPlan: true,
          teacher: { include: { user: true } },
        },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
      sessionLogs: {
        include: { attendance: true },
        orderBy: { lessonDate: 'desc' },
      },
    },
  });

  if (!student || student.enrollments.length === 0) {
    notFound();
  }

  const enrollment = student.enrollments[0];
  const progress = Math.round((enrollment.attendedSessions / enrollment.totalSessions) * 100);

  return (
    <main className="min-h-screen bg-slate-100 p-4 font-sans text-slate-800 pb-12">
      <div className="max-w-md mx-auto space-y-4">
        {/* Profile Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">Sổ Liên Lạc Điện Tử</p>
              <h1 className="text-xl font-black text-slate-900">{student.fullName}</h1>
              <p className="text-xs text-slate-500 font-medium">
                Mã HV: <span className="font-mono font-bold text-slate-700">{student.studentCode}</span> • GV: {enrollment.teacher.user.name}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
              {enrollment.pricingPlan.subject}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>Tiến độ khóa học: {enrollment.attendedSessions}/{enrollment.totalSessions} buổi</span>
              <span className="text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {enrollment.remainingSessions <= 1 && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              ⚠️ Gói học sắp kết thúc (còn {enrollment.remainingSessions} buổi). Vui lòng liên hệ trung tâm để đăng ký khóa mới.
            </div>
          )}
        </div>

        {/* Nhật ký buổi học */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Nhật ký từng buổi học</h2>

          {student.sessionLogs.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Chưa có buổi học nào được ghi nhận.
            </div>
          ) : (
            student.sessionLogs.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800">
                    📅 {new Date(log.lessonDate).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    log.attendance.status === 'ATTENDED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {log.attendance.status === 'ATTENDED' ? 'Có mặt' : 'Vắng'}
                  </span>
                </div>

                {log.assignment && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Bài tập về nhà</p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">{log.assignment}</p>
                  </div>
                )}

                {log.teacherEvaluation && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                    <p className="text-[11px] font-bold text-amber-800">Đánh giá của Thầy/Cô:</p>
                    <p className="text-xs text-amber-950 mt-0.5 italic">"{log.teacherEvaluation}"</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
