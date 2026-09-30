import Link from 'next/link';

type Tab = 'active' | 'paused' | 'dropped';

const TABS: { key: Tab; href: string; label: string; icon: string; on: string }[] = [
  { key: 'active', href: '/admin/dashboard#student-list', label: 'Danh Sách HV', icon: '📋', on: 'bg-indigo-600 text-white border-indigo-600' },
  { key: 'paused', href: '/admin/students/paused', label: 'HV Bảo Lưu', icon: '⏸️', on: 'bg-amber-500 text-white border-amber-500' },
  { key: 'dropped', href: '/admin/students/dropped', label: 'HV Thôi Học', icon: '🚪', on: 'bg-slate-700 text-white border-slate-700' },
];

/** Thanh nút luôn hiển thị: Danh sách HV | HV Bảo Lưu | HV Thôi Học */
export default function StudentStatusNav({
  current,
  counts,
}: {
  current: Tab;
  counts: Record<Tab, number>;
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Danh sách học viên theo trạng thái">
      {TABS.map((t) => {
        const isCurrent = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition whitespace-nowrap ${
              isCurrent ? t.on : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.icon} {t.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${isCurrent ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
              {counts[t.key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
