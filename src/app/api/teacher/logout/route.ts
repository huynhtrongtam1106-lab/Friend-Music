import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function handleLogout(req: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('friend_teacher_id');
  cookieStore.delete('friend_user_role');

  return NextResponse.redirect(new URL('/teacher/login', req.url));
}

export async function POST(req: Request) {
  return handleLogout(req);
}

export async function GET(req: Request) {
  return handleLogout(req);
}
