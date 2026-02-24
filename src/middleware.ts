import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAuthRedirectDecision } from '@/lib/authConfig';
import { fetchAuthProfileByUserId } from '@/lib/repositories/auth';

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

  const { data: authProfile, error: authProfileError } = await fetchAuthProfileByUserId(
    supabase,
    user.id,
  );

  if (authProfileError) {
    console.error('Auth profile query error:', authProfileError);
  }

  const decision = getAuthRedirectDecision({
    pathname,
    isAuthenticated: Boolean(user),
    role: authProfile?.role ?? null,
    mustChangePassword: authProfile?.mustChangePassword ?? false,
  });

  if (decision?.type === 'login') {
    const redirectUrl = new URL(decision.path, request.url);
    redirectUrl.searchParams.set('next', decision.nextPath);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (decision) {
    const redirectResponse = NextResponse.redirect(new URL(decision.path, request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/change-password'],
};
