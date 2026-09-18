'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddStudentModal({ plans, teachers }: { plans: any[]; teachers: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Tự động nhận diện môn học dựa vào chữ cái đầu của Mã HV (P, D, G, T, K)
  const getSubjectFromCode = (code: string) => {
    const firstChar = code.trim().charAt(0).toUpperCase();
    if (firstChar === 'P') return 'Piano';
    if (firstChar === 'D') return 'Drum';
    if (firstChar === 'G') return 'Guitar';
    if (firstChar === 'T') return 'Thanh nhạc';
    if (firstChar === 'K') return 'Keyboard';
    return '';
  };

  const detectedSubject = getSubjectFromCode(studentCode);

  // Lọc ra các gói học thuộc đúng bộ môn được nhận diện từ mã HV
  const filteredPlans = plans.filter((p) => {
    if (!detectedSubject) return true;
    return p.subject.toLowerCase() === detectedSubject.toLowerCase();
  });

  // Lọc ra giáo viên phụ trách đúng bộ môn đó
  const filteredTeachers = teachers.filter((t) => {
    if (!detectedSubject) return true;
    if (!t.specializations || t.specializations.length === 0) return true;
    return t.specializations.some((spec: string) => 
      spec.toLowerCase().includes(detectedSubject.toLowerCase()) ||
      detectedSubject.toLowerCase().includes(spec.toLowerCase())
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode,
          fullName,
          phone,
          pricingPlanId: selectedPlanId,
          teacherId: selectedTeacherId || teachers[0]?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra khi thêm học viên');

      setIsOpen(false);
      setStudentCode('');
      setFullName('');
      setPhone('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
      >
        <span>+</span> Thêm Học Viên Mới
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Thêm Học Viên Theo Mã Môn</h3>
                <p className="text-xs text-slate-500">Hệ thống tự động nhận diện môn học và giáo viên từ Mã HV</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mã Học Viên</label>
                  <input
                    type="text"
                    required
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                    placeholder="VD: P01, D01, G01..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold transition uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Môn Nhận Diện</label>
                  <div className="w-full px-3.5 py-2.5 text-xs bg-indigo-50 border border-indigo-100 rounded-xl font-bold text-indigo-700 flex items-center">
                    {detectedSubject ? `🎸 ${detectedSubject}` : '⚠️ Nhập mã (P, D, G, T, K)'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Họ và Tên Học Viên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Số Điện Thoại</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Chọn Gói Đăng Ký Học Phí</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                >
                  {(filteredPlans.length > 0 ? filteredPlans : plans).map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.subject}] {p.packageName} ({p.numberOfSessions} buổi) — {Number(p.price).toLocaleString('vi-VN')} đ
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Giáo Viên Phụ Trách Bộ Môn</span>
                  {detectedSubject && (
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">
                      Đã lọc theo môn: {detectedSubject}
                    </span>
                  )}
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                >
                  <option value="">-- Chọn giáo viên phụ trách --</option>
                  {(filteredTeachers.length > 0 ? filteredTeachers : teachers).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name} ({t.specializations?.join(', ') || 'Chuyên môn khác'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Đang lưu...' : 'Xác Nhận Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
