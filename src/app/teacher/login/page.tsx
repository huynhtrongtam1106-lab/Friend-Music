import TeacherLoginForm from '@/components/teacher/teacher-login-form';

export const dynamic = 'force-dynamic';

export default function TeacherLoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-xl p-6 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-3xl">🎵</span>
          <h1 className="text-xl font-black text-slate-900">Cổng Điểm Danh Giáo Viên</h1>
          <p className="text-xs text-slate-500">Đăng nhập tài khoản cá nhân</p>
        </div>

        <TeacherLoginForm />
      </div>
    </main>
  );
}
