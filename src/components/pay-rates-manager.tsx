'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Rate = {
  id: string;
  teacherId: string | null;
  teacherName: string | null;
  subject: string | null;
  classType: 'INDIVIDUAL' | 'GROUP';
  groupSize: number;
  amount: number;
};

const money = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

export default function PayRatesManager({
  rates,
  teachers,
  subjects,
}: {
  rates: Rate[];
  teachers: { id: string; name: string }[];
  subjects: string[];
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [classType, setClassType] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');
  const [groupSize, setGroupSize] = useState('2');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amountNumber = Number(amount.replace(/\D/g, ''));

  const save = async () => {
    setError('');
    if (!amountNumber && amountNumber !== 0) return setError('Vui lòng nhập đơn giá');
    if (amount === '') return setError('Vui lòng nhập đơn giá');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pay-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacherId || null,
          subject: subject || null,
          classType,
          groupSize: classType === 'GROUP' ? Number(groupSize) : 0,
          amount: amountNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAmount('');
        router.refresh();
      } else {
        setError(data.error || 'Không lưu được đơn giá');
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa đơn giá này?')) return;
    const res = await fetch(`/api/admin/pay-rates?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    else alert('Không xóa được đơn giá');
  };

  const edit = (r: Rate) => {
    setTeacherId(r.teacherId || '');
    setSubject(r.subject || '');
    setClassType(r.classType);
    setGroupSize(String(r.groupSize || 2));
    setAmount(String(r.amount));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sorted = [...rates].sort(
    (a, b) =>
      (a.teacherName || '').localeCompare(b.teacherName || '', 'vi') ||
      (a.subject || '').localeCompare(b.subject || '', 'vi') ||
      a.classType.localeCompare(b.classType) ||
      a.groupSize - b.groupSize
  );

  const inputCls =
    'w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-sm">Thêm / cập nhật đơn giá</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Giáo viên</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={inputCls}>
              <option value="">Tất cả giáo viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Môn</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
              <option value="">Tất cả môn</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Loại lớp</label>
            <select
              value={classType}
              onChange={(e) => setClassType(e.target.value as 'INDIVIDUAL' | 'GROUP')}
              className={inputCls}
            >
              <option value="INDIVIDUAL">Lớp cá nhân</option>
              <option value="GROUP">Lớp nhóm</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Số học viên có mặt</label>
            <input
              type="number"
              min={1}
              max={30}
              disabled={classType !== 'GROUP'}
              value={classType === 'GROUP' ? groupSize : ''}
              onChange={(e) => setGroupSize(e.target.value)}
              placeholder={classType === 'GROUP' ? '' : 'Không áp dụng'}
              className={`${inputCls} disabled:opacity-50`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Đơn giá / buổi (₫)</label>
            <input
              inputMode="numeric"
              value={amount === '' ? '' : amountNumber.toLocaleString('vi-VN')}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="VD: 150.000"
              className={inputCls}
            />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu đơn giá'}
          </button>
          <p className="text-[11px] text-slate-400">
            Nhập trùng giáo viên + môn + loại lớp + số học viên thì sẽ ghi đè đơn giá cũ.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="font-bold text-slate-900 text-sm">Đơn giá đã cài ({rates.length})</h2>
        {rates.length === 0 ? (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-4">
            Chưa có đơn giá nào. Hãy bắt đầu bằng đơn giá chung cho tất cả giáo viên (để Giáo viên và Môn là &quot;Tất cả&quot;):
            lớp cá nhân, lớp nhóm 2 học viên, lớp nhóm 3 học viên...
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="py-2">Áp dụng cho</th>
                  <th className="py-2">Loại lớp</th>
                  <th className="py-2 text-right">Đơn giá / buổi</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-slate-700">
                      <b>{r.teacherName || 'Tất cả giáo viên'}</b>
                      <span className="text-slate-400"> · </span>
                      {r.subject || 'Tất cả môn'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded ${
                          r.classType === 'INDIVIDUAL' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
                        }`}
                      >
                        {r.classType === 'INDIVIDUAL' ? 'Cá nhân' : `Nhóm ${r.groupSize} HV`}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{money(r.amount)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => edit(r)} className="text-[11px] font-bold text-indigo-600 hover:underline mr-3">
                        Sửa
                      </button>
                      <button onClick={() => remove(r.id)} className="text-[11px] font-bold text-rose-600 hover:underline">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-[11px] text-slate-600 space-y-1.5">
        <p className="font-bold text-slate-700">Cách hệ thống chọn đơn giá cho mỗi buổi dạy</p>
        <p>• Đơn giá riêng cho giáo viên được ưu tiên hơn đơn giá riêng cho môn, rồi mới đến đơn giá chung.</p>
        <p>• Lớp nhóm tính theo số học viên <b>có mặt</b> trong buổi đó. Nếu chưa cài đúng mốc (ví dụ buổi có 4 học viên nhưng mới cài nhóm 2 và nhóm 3 HV), hệ thống dùng mốc lớn nhất nhỏ hơn (nhóm 3 HV).</p>
        <p>• Buổi mà tất cả học viên đều vắng thì không tính tiền.</p>
      </div>
    </div>
  );
}
