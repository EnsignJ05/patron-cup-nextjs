import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, must_change_password')
    .eq('player_id', user.id)
    .single();

  if (profile?.must_change_password && pathname !== '/change-password') {
    const redirectResponse = NextResponse.redirect(new URL('/change-password', request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (pathname === '/change-password' && !profile?.must_change_password) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (pathname.startsWith('/admin') && profile?.role !== 'committee') {
    const redirectResponse = NextResponse.redirect(new URL('/unauthorized', request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (pathname.startsWith('/dashboard') && !['committee', 'player'].includes(profile?.role)) {
    const redirectResponse = NextResponse.redirect(new URL('/unauthorized', request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/change-password'],
};
