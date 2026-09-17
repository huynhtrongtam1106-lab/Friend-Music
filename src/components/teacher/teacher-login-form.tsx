'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      alert('Vui lòng nhập Email của bạn!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push('/teacher/attendance');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 text-xs">
      <div>
        <label className="block font-bold text-slate-700 mb-1.5">Email Giáo Viên đã đăng ký</label>
        <input
          type="email"
          required
          placeholder="teacher@friendmusic.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <p className="text-[11px] text-slate-400 mt-1.5">
          Nhập đúng địa chỉ email được quản trị viên cấp để mở lớp dạy của bạn.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition disabled:opacity-50"
      >
        {loading ? 'Đang xác thực...' : 'Đăng Nhập Lớp Học →'}
      </button>
    </form>
  );
}
