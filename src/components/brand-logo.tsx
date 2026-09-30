/**
 * Logo Friend Music School.
 * File /logo.png là ảnh vuông có nhiều viền trắng, nên component này cắt bớt
 * viền để logo hiện rõ, đúng tỷ lệ ngang. Chỉ cần đặt chiều rộng qua className, ví dụ "w-40".
 */
export default function BrandLogo({ className = 'w-40' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white ${className}`} style={{ aspectRatio: '3 / 1' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Friend Music School"
        className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ width: '142%' }}
        draggable={false}
      />
    </div>
  );
}
