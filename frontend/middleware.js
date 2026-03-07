import { NextResponse } from 'next/server';
export function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');
  const isPublic = request.nextUrl.pathname.startsWith('/qr-login') ||
                   request.nextUrl.pathname.startsWith('/qr-login-tv') ||
                   request.nextUrl.pathname.startsWith('/tv') ||
                   request.nextUrl.pathname.startsWith('/player');

  if (isPublic) return NextResponse.next();

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
