'use client';

import React, { useState } from 'react';

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');

      // Lưu đồng thời đầy đủ tất cả các biến mà hệ thống hay dùng vào localStorage
      if (data.teacherId) {
        localStorage.setItem('teacherId', data.teacherId);
        localStorage.setItem('role', data.user?.role || 'TEACHER');
        localStorage.setItem('userEmail', data.user?.email || email);
      }
      
      // Đồng thời gán đầy đủ cookie cho cả client và server đọc
      document.cookie = `teacherId=${data.teacherId || ''}; path=/; max-age=604800; samesite=lax`;
      document.cookie = `auth_session=true; path=/; max-age=604800; samesite=lax`;
      document.cookie = `role=${data.user?.role || 'TEACHER'}; path=/; max-age=604800; samesite=lax`;

      // Đợi 0.2 giây để trình duyệt lưu hẳn cookie rồi mới chuyển trang
      setTimeout(() => {
        window.location.href = '/teacher/attendance';
      }, 200);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-xl shadow-md">
            🎵
          </div>
          <h1 className="text-xl font-black text-slate-900">Cổng Điểm Danh Giáo Viên</h1>
          <p className="text-xs text-slate-500">Nhập Gmail đã đăng ký với trung tâm để tiếp tục</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Giáo Viên</label>
            <input
              type="email"
              required
              placeholder="vidu.giaovien@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-medium transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
          </button>
        </form>
      </div>
    </main>
  );
}
