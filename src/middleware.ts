import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get('friend_user_role')?.value;

  // 1. Cho phép các file tĩnh và API xác thực chạy bình thường
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/p/') || // Sổ liên lạc phụ huynh không cần login
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Nếu đang ở trang đăng nhập (/)
  if (pathname === '/') {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (userRole === 'TEACHER') {
      return NextResponse.redirect(new URL('/teacher/attendance', request.url));
    }
    return NextResponse.next();
  }

  // 3. Nếu chưa đăng nhập mà cố vào trang nội bộ
  if (!userRole) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. Phân quyền giáo viên: chặn vào trang Admin
  if (userRole === 'TEACHER' && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/teacher/attendance', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
