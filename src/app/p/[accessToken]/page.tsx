import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ParentPortalPage({ params }: { params: Promise<{ accessToken: string }> }) {
  const { accessToken } = await params;

  const student = await prisma.student.findUnique({
    where: { accessToken: accessToken, deletedAt: null },
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

  const isGroupClass = 
    enrollment.pricingPlan.packageName.toLowerCase().includes('nhóm') || 
    enrollment.pricingPlan.packageName.toLowerCase().includes('group') ||
    enrollment.pricingPlan.subject.toLowerCase().includes('nhóm');

  let tuitionDateFormatted = '';
  let nextDueDateFormatted = '';

  if (isGroupClass && enrollment.startDate) {
    const startDateObj = new Date(enrollment.startDate);
    tuitionDateFormatted = startDateObj.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const dueDateObj = new Date(startDateObj);
    dueDateObj.setMonth(dueDateObj.getMonth() + 1);
    nextDueDateFormatted = dueDateObj.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

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

          {isGroupClass ? (
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-500">Hình thức học:</span>
                <span className="font-bold text-indigo-600">Lớp Nhóm ({enrollment.pricingPlan.packageName})</span>
              </div>
              <div className="flex justify-between font-medium px-1">
                <span className="text-slate-500">📅 Ngày đóng học phí:</span>
                <span className="font-bold text-slate-800">{tuitionDateFormatted || 'Cập nhật sau'}</span>
              </div>
              <div className="flex justify-between font-medium px-1">
                <span className="text-slate-500">⏰ Ngày đến hạn (Tháng sau):</span>
                <span className="font-bold text-rose-600">{nextDueDateFormatted || 'Cập nhật sau'}</span>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span>Tiến độ khóa học: {enrollment.attendedSessions}/{enrollment.totalSessions} buổi</span>
                <span className="text-indigo-600">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {!isGroupClass && enrollment.remainingSessions <= 1 && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              ⚠️ Gói học sắp kết thúc (còn {enrollment.remainingSessions} buổi). Vui lòng liên hệ trung tâm để đăng ký khóa mới.
            </div>
          )}
        </div>

        {/* Nhật ký buổi học & Bài tập */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Nhật ký buổi học & Bài tập</h2>

          {student.sessionLogs.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Chưa có buổi học nào được ghi nhận.
            </div>
          ) : (
            student.sessionLogs.map((log) => {
              const gradeText = log.grade || 'Chưa kiểm tra';
              return (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
                  {/* Ngày học & Trạng thái điểm danh */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-800">
                      📅 Ngày học: {new Date(log.lessonDate).toLocaleDateString('vi-VN')}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      log.attendance.status === 'ATTENDED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {log.attendance.status === 'ATTENDED' ? 'Có mặt' : 'Vắng'}
                    </span>
                  </div>

                  {/* Thông tin Bài tập & Thời hạn */}
                  {log.assignment && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                      <p className="font-bold text-slate-800">📚 Bài tập: <span className="font-normal text-slate-600">{log.assignment}</span></p>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400">Hạn nộp (Deadline):</span>{' '}
                          <span className="font-bold text-rose-600">{log.dueDate ? new Date(log.dueDate).toLocaleDateString('vi-VN') : 'Không có'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Trạng thái:</span>{' '}
                          <span className={`font-bold px-1.5 py-0.5 rounded ${
                            log.status === 'Đã xong' ? 'bg-emerald-100 text-emerald-700' :
                            log.status === 'Trễ hạn' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Kết quả đánh giá (chỉ hiện Đạt/Không đạt khi GV chấm, còn lại hiện Đang luyện tập) */}
                  <div className="flex justify-between items-center px-1">
                    <span className="text-slate-500 font-semibold">Kết quả đánh giá:</span>
                    <span className={`font-bold px-2.5 py-1 rounded text-[11px] ${
                      gradeText === 'Đạt' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : gradeText === 'Không đạt' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {gradeText === 'Chưa kiểm tra' ? '⏳ Đang luyện tập (Chưa kiểm tra)' : gradeText}
                    </span>
                  </div>

                  {/* Nhận xét của Thầy/Cô */}
                  {log.teacherEvaluation && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                      <p className="font-bold text-amber-800">💬 Nhận xét của Thầy/Cô:</p>
                      <p className="text-amber-950 mt-0.5 italic">"{log.teacherEvaluation}"</p>
                    </div>
                  )}

                  {/* Ghi chú */}
                  {log.note && (
                    <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-900">
                      <p className="font-bold">📌 Ghi chú:</p>
                      <p className="mt-0.5">{log.note}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
