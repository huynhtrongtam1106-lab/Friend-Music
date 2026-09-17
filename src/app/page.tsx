'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      alert('Vui lòng nhập Email!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(data.redirectTo);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-orange-500/5 p-8 space-y-6">
        
        {/* Khu vực hiển thị Logo thương hiệu */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            {/* Đảm bảo bạn đã đặt file logo.png vào thư mục public/logo.png */}
            <img 
              src="/logo.png" 
              alt="Friend Music School Logo" 
              className="h-14 w-auto object-contain mx-auto"
            />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Friend Music School</h1>
            <p className="text-xs text-slate-400 mt-0.5">Cổng đăng nhập Quản trị & Giáo viên</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Địa chỉ Email</label>
            <input
              type="email"
              required
              placeholder="VD: example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-[#f95514] focus:bg-white focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#f95514] hover:bg-[#e04b10] text-white font-bold rounded-2xl transition disabled:opacity-50 shadow-md shadow-orange-500/20 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống →'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Phần mềm quản lý chuyên dụng cho Trung Tâm
          </p>
        </div>
      </div>
    </main>
  );
}