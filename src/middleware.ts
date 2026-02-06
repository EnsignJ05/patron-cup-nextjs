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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile query error:', profileError);
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (playerError) {
    console.error('Player query error:', playerError);
  }
  
  console.log('Middleware check:', { 
    userId: user.id, 
    email: user.email,
    profile, 
    player,
    pathname 
  });

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

  if (pathname.startsWith('/admin') && !['committee', 'admin'].includes(player?.role)) {
    const redirectResponse = NextResponse.redirect(new URL('/unauthorized', request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (pathname.startsWith('/dashboard') && !['committee', 'player', 'admin'].includes(player?.role)) {
    const redirectResponse = NextResponse.redirect(new URL('/unauthorized', request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/change-password'],
};
