'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [role, setRole] = useState<'ADMIN' | 'TEACHER'>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Gọi API xác thực đăng nhập
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }

      // Điều hướng dựa theo vai trò sau khi đăng nhập thành công
      if (data.role === 'ADMIN') {
        router.push('/');
      } else {
        router.push('/teacher/attendance');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-indigo-600 text-white font-black text-2xl rounded-2xl mx-auto flex items-center justify-center shadow-md shadow-indigo-100">
            ♪
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">Friend Music Center</h1>
          <p className="text-xs text-slate-500">Đăng nhập cổng điều hành học viện</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg transition ${role === 'ADMIN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            onClick={() => setRole('ADMIN')}
          >
            Quản trị viên (Admin)
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg transition ${role === 'TEACHER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            onClick={() => setRole('TEACHER')}
          >
            Giáo viên (Teacher)
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-bold text-center">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder={role === 'ADMIN' ? 'admin@friendmusic.vn' : 'teacher@friendmusic.vn'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100 transition text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Phụ huynh xem sổ liên lạc qua Magic Link không cần đăng nhập mật khẩu.
        </p>
      </div>
    </div>
  );
}