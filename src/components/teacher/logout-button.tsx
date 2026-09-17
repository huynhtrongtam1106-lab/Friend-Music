'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/teacher/logout', { method: 'POST' });
    router.push('/teacher/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition"
    >
      Đổi GV
    </button>
  );
}
