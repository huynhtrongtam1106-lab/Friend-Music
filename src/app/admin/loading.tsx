// Hiện ngay khi bấm chuyển trang trong khu vực /admin,
// trong lúc server đang lấy dữ liệu từ database.
export default function AdminLoading() {
  return (
    <main className="min-h-screen w-full bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-24 bg-white rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="h-5 w-1/3 bg-slate-100 rounded" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
