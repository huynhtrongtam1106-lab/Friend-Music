'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function AddStudentModal({
  plans,
  teachers,
}: {
  plans: any[];
  teachers: any[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; code: string; link: string } | null>(null);

  // Tự động nhận diện môn theo ký tự đầu của Mã HV (Đã hỗ trợ K -> Keyboard)
  const detectedSubject = useMemo(() => {
    const prefix = studentCode.trim().charAt(0).toUpperCase();
    if (prefix === 'P') return 'Piano';
    if (prefix === 'D') return 'Drum';
    if (prefix === 'G') return 'Guitar';
    if (prefix === 'T') return 'Thanh Nhạc';
    if (prefix === 'K') return 'Keyboard';
    return '';
  }, [studentCode]);

  // Lọc giáo viên phụ trách môn đã nhận diện
  const availableTeachers = useMemo(() => {
    if (!detectedSubject) return teachers;
    const matched = teachers.filter((t) =>
      t.specializations.some((s: string) => s.toLowerCase() === detectedSubject.toLowerCase())
    );
    return matched.length > 0 ? matched : teachers;
  }, [detectedSubject, teachers]);

  // Lọc gói học theo môn đã nhận diện
  const availablePlans = useMemo(() => {
    if (!detectedSubject) return plans;
    const matched = plans.filter((p) => p.subject.toLowerCase() === detectedSubject.toLowerCase());
    return matched.length > 0 ? matched : plans;
  }, [detectedSubject, plans]);

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  React.useEffect(() => {
    if (availablePlans.length > 0) {
      const defaultPlan = availablePlans.find((p) => p.packageName.includes('4 buổi')) || availablePlans[0];
      setSelectedPlanId(defaultPlan.id);
    }
    if (availableTeachers.length > 0) {
      setSelectedTeacherId(availableTeachers[0].id);
    }
  }, [detectedSubject, availablePlans, availableTeachers]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode,
          fullName,
          parentPhone,
          parentEmail,
          note,
          teacherId: selectedTeacherId,
          pricingPlanId: selectedPlanId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCreatedInfo({
        name: data.data.student.fullName,
        code: data.data.student.studentCode,
        link: window.location.origin + data.magicLink,
      });

      setStudentCode('');
      setFullName('');
      setParentPhone('');
      setParentEmail('');
      setNote('');
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
        onClick={() => { setOpen(true); setCreatedInfo(null); }}
        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition flex items-center gap-1.5"
      >
        <span>➕</span> Thêm Học Viên Mới
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">➕ Thêm Học Viên Mới</h3>
                <p className="text-xs text-slate-500">Tự động liên kết giáo viên, bảng giá và tạo sổ liên lạc</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            {createdInfo ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-emerald-800">🎉 Tạo thành công học viên: {createdInfo.name} ({createdInfo.code})</p>
                  <p className="text-xs text-slate-600">Đã kích hoạt Sổ liên lạc online. Bạn có thể sao chép link bên dưới gửi qua Zalo cho Phụ huynh:</p>
                  <div className="flex gap-2 items-center">
                    <input
                      readOnly
                      value={createdInfo.link}
                      className="text-xs w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdInfo.link); alert('Đã sao chép link!'); }}
                      className="px-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg whitespace-nowrap"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setCreatedInfo(null); setOpen(false); }}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  Đóng cửa sổ
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mã HV (VD: P01, D01, G01, T01, K01) *</label>
                    <input
                      required
                      placeholder="K01"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono uppercase font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                    {detectedSubject && (
                      <span className="text-[10px] font-bold text-indigo-600 mt-1 inline-block">
                        Nhận diện bộ môn: {detectedSubject}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Họ và Tên Học Viên *</label>
                    <input
                      required
                      placeholder="VD: Gia Hân, Tuấn Kiệt..."
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Giáo viên phụ trách *</label>
                    <select
                      required
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {availableTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.user.name} ({t.specializations.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gói học (Pricing Plan) *</label>
                    <select
                      required
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.subject}] {p.packageName} ({p.numberOfSessions}b)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedPlan && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Học phí tự động tính:</span>
                    <span className="font-mono font-bold text-sm text-indigo-700">
                      {Number(selectedPlan.price).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SĐT Phụ huynh (Nhận Zalo)</label>
                    <input
                      placeholder="0901234567"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Phụ huynh</label>
                    <input
                      type="email"
                      placeholder="phuhuynh@gmail.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú ban đầu</label>
                  <input
                    placeholder="VD: Học viên đăng ký học Keyboard cơ bản..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100"
                  >
                    {loading ? 'Đang lưu vào Supabase...' : 'Lưu Học Viên & Tạo Sổ Liên Lạc'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
