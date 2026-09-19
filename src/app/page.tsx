'use client';

import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại.');
      }

      const targetUrl = data.redirectTo || (data.role === 'TEACHER' ? '/teacher/attendance' : '/admin/dashboard');
      window.location.replace(targetUrl);

    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="w-48 h-20 relative mb-2 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="Friend Music School Logo"
              className="w-full h-full object-contain scale-[2.2]"
            />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight pt-1">FRIEND MUSIC</h1>
          <p className="text-xs text-slate-400">Cổng đăng nhập hệ thống trung tâm</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-bold text-center">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Địa chỉ Email</label>
            <input
              type="email"
              required
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống →'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400">
          Phần mềm quản lý chuyên dụng cho Trung Tâm
        </p>
      </div>
    </div>
  );
}
