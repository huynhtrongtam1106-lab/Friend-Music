'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditStudentModal({ 
  enrollment, 
  plans, 
  teachers 
}: { 
  enrollment: any; 
  plans: any[]; 
  teachers: any[] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [fullName, setFullName] = useState(enrollment.student.fullName || '');
  const [phone, setPhone] = useState(enrollment.student.phone || '');
  const [teacherId, setTeacherId] = useState(enrollment.teacherId || '');
  const [pricingPlanId, setPricingPlanId] = useState(enrollment.pricingPlanId || '');
  const [scheduleText, setScheduleText] = useState(enrollment.scheduleText || '');
  const [status, setStatus] = useState(enrollment.student.status || 'ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/students`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: enrollment.student.id, // Truyền kèm ID vào body để file API nhận diện chính xác
          fullName,
          phone,
          teacherId,
          pricingPlanId,
          scheduleText,
          status,
          enrollmentId: enrollment.id
        }),
      });

      if (!res.ok) throw new Error('Cập nhật thất bại');

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      alert('Có lỗi xảy ra khi cập nhật thông tin học viên!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition text-[11px]"
        title="Chỉnh sửa thông tin học viên"
      >
        ✏️
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Sửa Thông Tin Học Viên</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Họ và tên học viên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Số điện thoại</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Giáo viên phụ trách</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Trạng thái</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="ACTIVE">Đang học</option>
                    <option value="PAUSED">Bảo lưu</option>
                    <option value="DROPPED">Nghỉ học</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Gói khóa học</label>
                <select
                  value={pricingPlanId}
                  onChange={(e) => setPricingPlanId(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-xl bg-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>[{p.subject}] {p.packageName} ({Number(p.price).toLocaleString()}đ)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Lịch học cố định (Ví dụ: Thứ 2, 4 - 19h)</label>
                <input
                  type="text"
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  placeholder="Nhập lịch học cố định..."
                  className="w-full mt-1 p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow-md transition"
                >
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}