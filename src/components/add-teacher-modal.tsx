'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const SUBJECT_OPTIONS = ['Piano', 'Guitar', 'Drum', 'Thanh Nhạc', 'Keyboard'];

export default function AddTeacherModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specializations, setSpecializations] = useState<string[]>(['Piano']);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (sub: string) => {
    setSpecializations((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (specializations.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bộ môn phụ trách!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          password,
          specializations,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`🎉 Đã thêm giáo viên: ${name}`);
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setSpecializations(['Piano']);
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left cursor-pointer"
      >
        <span>👨‍🏫</span> Thêm Giáo Viên Mới
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">👨‍🏫 Thêm Giáo Viên Mới</h3>
                <p className="text-xs text-slate-500">Phân công môn dạy và tài khoản đăng nhập</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Giáo Viên *</label>
                <input
                  required
                  placeholder="VD: Thầy Nam, Cô Linh..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  placeholder="0987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mật khẩu *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Bộ môn phụ trách (chọn nhiều môn) *</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((sub) => {
                    const checked = specializations.includes(sub);
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => toggleSubject(sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          checked
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '} {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer transition"
                >
                  {loading ? 'Đang lưu...' : 'Lưu Giáo Viên'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer transition hover:bg-slate-200"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}