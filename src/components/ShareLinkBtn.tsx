'use client';

import { useState } from 'react';

export default function ShareLinkBtn({ accessToken }: { accessToken: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/p/${accessToken}`;
      
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Không thể copy link', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
        copied
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
      }`}
      title="Sao chép đường dẫn sổ liên lạc của học viên"
    >
      <span>{copied ? '✅ Đã copy link!' : '🔗 Copy Link Sổ Liên Lạc'}</span>
    </button>
  );
}