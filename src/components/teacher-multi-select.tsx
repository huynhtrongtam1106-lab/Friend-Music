'use client';

import { useMemo, useState } from 'react';

/**
 * Chọn nhiều giáo viên cho 1 học viên.
 * - Người được tích ĐẦU TIÊN là "GV chính" (teacherIds[0]).
 * - Các thầy còn lại là GV phụ: vẫn thấy HV trong lớp của mình và điểm danh được.
 */
export default function TeacherMultiSelect({
  teachers,
  value,
  onChange,
  subject,
}: {
  teachers: any[];
  value: string[];
  onChange: (ids: string[]) => void;
  subject?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  const matchesSubject = (t: any) => {
    if (!subject) return true;
    if (!t.specializations || t.specializations.length === 0) return true;
    return t.specializations.some(
      (spec: string) =>
        spec.toLowerCase().includes(subject.toLowerCase()) ||
        subject.toLowerCase().includes(spec.toLowerCase())
    );
  };

  const visible = useMemo(() => {
    if (showAll || !subject) return teachers;
    const filtered = teachers.filter(matchesSubject);
    // luôn giữ lại các thầy đã được chọn, dù khác môn
    const extra = teachers.filter((t) => value.includes(t.id) && !filtered.includes(t));
    const list = [...filtered, ...extra];
    return list.length > 0 ? list : teachers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, subject, showAll, value]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
        {visible.map((t) => {
          const checked = value.includes(t.id);
          const isMain = value[0] === t.id;
          return (
            <label
              key={t.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition ${
                checked ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(t.id)}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="flex-1 text-xs font-medium text-slate-800">
                {t.user.name}{' '}
                <span className="text-slate-400 font-normal">
                  ({t.specializations?.join(', ') || 'Chuyên môn khác'})
                </span>
              </span>
              {checked && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isMain ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isMain ? 'GV chính' : 'GV phụ'}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-500">
          {value.length === 0 ? (
            <span className="text-rose-600 font-bold">Chọn ít nhất 1 giáo viên</span>
          ) : (
            <>Đã chọn {value.length} · người tích đầu tiên là GV chính</>
          )}
        </span>
        {subject && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-indigo-600 font-bold hover:underline"
          >
            {showAll ? `Chỉ hiện GV môn ${subject}` : 'Hiện tất cả giáo viên'}
          </button>
        )}
      </div>
    </div>
  );
}
