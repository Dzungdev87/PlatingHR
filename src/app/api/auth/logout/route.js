import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json({ message: 'Đăng xuất thành công' });

  // Clear the token cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  return response;
}
