'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUBJECT_OPTIONS = ['Piano', 'Guitar', 'Drum', 'Thanh Nhạc', 'Keyboard'];

interface Plan {
  id: string;
  subject: string;
  packageName: string;
  numberOfSessions: number;
  price: number;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const emptyForm = { subject: SUBJECT_OPTIONS[0], packageName: '', numberOfSessions: '', price: '' };

export default function ManagePricingPlansDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  useEffect(() => {
    if (open) loadPlans();
  }, [open]);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing-plans');
      const data = await res.json();
      if (res.ok) setPlans(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p: Plan) {
    setEditingId(p.id);
    setForm({
      subject: p.subject,
      packageName: p.packageName,
      numberOfSessions: String(p.numberOfSessions),
      price: String(p.price),
    });
  }

  function startCreate() {
    setEditingId('NEW');
    setForm(emptyForm);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.packageName.trim() || !form.numberOfSessions || !form.price) {
      alert('Vui lòng nhập đầy đủ Tên gói, Số buổi và Học phí!');
      return;
    }
    setSaving(true);
    try {
      const isNew = editingId === 'NEW';
      const res = await fetch('/api/admin/pricing-plans', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isNew ? {} : { id: editingId }),
          subject: form.subject,
          packageName: form.packageName,
          numberOfSessions: Number(form.numberOfSessions),
          price: Number(form.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');

      await loadPlans();
      cancelEdit();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi lưu gói học');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: Plan) {
    const res = await fetch('/api/admin/pricing-plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    });
    if (res.ok) {
      await loadPlans();
      router.refresh();
    }
  }

  async function handleDelete(p: Plan) {
    if (!confirm(`Xóa gói học "${p.packageName}" (${p.subject})?`)) return;
    const res = await fetch('/api/admin/pricing-plans', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Không thể xóa gói học');
      return;
    }
    if (data.message) alert(data.message);
    await loadPlans();
    router.refresh();
  }

  if (!open) return null;

  const grouped: Record<string, Plan[]> = {};
  for (const p of plans) {
    if (!grouped[p.subject]) grouped[p.subject] = [];
    grouped[p.subject].push(p);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Quản Lý Gói Học</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tự đặt tên hiển thị cho từng gói, ví dụ: "Lớp nhóm 2(3) buổi/tuần (1 tháng)"</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition"
        >
          + Thêm Gói Học Mới
        </button>

        {editingId === 'NEW' && (
          <PlanForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
        )}

        {loading ? (
          <p className="text-center text-xs text-slate-400 py-6">Đang tải...</p>
        ) : (
          Object.entries(grouped).map(([subject, subjectPlans]) => (
            <div key={subject} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2">{subject}</p>
              {subjectPlans.map((p) => (
                <div key={p.id}>
                  {editingId === p.id ? (
                    <PlanForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
                  ) : (
                    <div
                      className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-xs ${
                        p.isActive ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.packageName}</p>
                        <p className="text-slate-500">
                          {p.numberOfSessions} buổi · {p.price.toLocaleString('vi-VN')}đ
                          {!p.isActive && <span className="ml-2 text-rose-500 font-bold">(Đã ẩn)</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(p)}
                          className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition"
                          title="Sửa"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleToggleActive(p)}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition"
                          title={p.isActive ? 'Ẩn gói này khỏi danh sách chọn mới' : 'Bật lại gói này'}
                        >
                          {p.isActive ? '🙈' : '👁️'}
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition"
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        {!loading && plans.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-6">Chưa có gói học nào. Bấm "+ Thêm Gói Học Mới" ở trên.</p>
        )}
      </div>
    </div>
  );
}

function PlanForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="p-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-bold text-slate-700">Môn học</label>
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-700">Số buổi</label>
          <input
            type="number"
            min={1}
            value={form.numberOfSessions}
            onChange={(e) => setForm({ ...form, numberOfSessions: e.target.value })}
            className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold text-slate-700">Tên gói hiển thị</label>
        <input
          type="text"
          value={form.packageName}
          onChange={(e) => setForm({ ...form, packageName: e.target.value })}
          placeholder='Ví dụ: Lớp nhóm 2(3) buổi/tuần (1 tháng)'
          className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg"
        />
      </div>
      <div>
        <label className="text-[11px] font-bold text-slate-700">Học phí (đ)</label>
        <input
          type="number"
          min={0}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}
