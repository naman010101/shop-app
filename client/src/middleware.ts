import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const isDashboardRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/inflow') || 
    pathname.startsWith('/sales') || 
    pathname.startsWith('/outflow') || 
    pathname.startsWith('/reports') || 
    pathname.startsWith('/users') || 
    pathname.startsWith('/settings');

  const isAuthRoute = pathname.startsWith('/login');

  if (!token && isDashboardRoute) {
    // Redirect to login page if trying to access dashboard route without token
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  if (token && (isAuthRoute || pathname === '/')) {
    // Redirect to dashboard page if trying to access auth route or root with token
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }

  // Allow access if none of the conditions met
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
