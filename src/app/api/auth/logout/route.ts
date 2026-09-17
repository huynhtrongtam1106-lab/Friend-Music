import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function handleLogout(req: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('friend_user_role');
  cookieStore.delete('friend_user_email');
  cookieStore.delete('friend_teacher_id');

  return NextResponse.redirect(new URL('/', req.url));
}

export async function POST(req: Request) {
  return handleLogout(req);
}

export async function GET(req: Request) {
  return handleLogout(req);
}
