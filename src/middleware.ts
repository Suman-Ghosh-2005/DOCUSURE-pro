import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Fetch user role if authenticated using Admin client (bypasses RLS recursion)
  let role = 'APPLICANT';
  if (user) {
    let dbRole: string | undefined;

    if (serviceRoleKey) {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      dbRole = profile?.role;
    }

    const candidateRole = (dbRole || user.user_metadata?.role || 'APPLICANT').toUpperCase();
    if (candidateRole === 'OFFICER') {
      role = 'OFFICER';
    }

    console.log('[AUTH DEBUG] login email =', user.email);
    console.log('[AUTH DEBUG] authenticated user id =', user.id);
    console.log('[AUTH DEBUG] authenticated user email =', user.email);
    console.log('[AUTH DEBUG] profile id =', user.id);
    console.log('[AUTH DEBUG] profile role =', role);
    console.log('[AUTH DEBUG] officer authorization result =', role === 'OFFICER');
  }

  // Allow /officer/login as dedicated public login page
  if (pathname === '/officer/login') {
    if (user && role === 'OFFICER') {
      const url = request.nextUrl.clone();
      url.pathname = '/officer/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 1. Applicant Portal Route Protection
  if (pathname.startsWith('/applicant')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (role === 'OFFICER') {
      const url = request.nextUrl.clone();
      url.pathname = '/officer/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // 2. Officer Workstation Route Protection (excluding /officer/login handled above)
  if (pathname.startsWith('/officer')) {
    if (!user || role !== 'OFFICER') {
      const url = request.nextUrl.clone();
      url.pathname = '/officer/login';
      return NextResponse.redirect(url);
    }
  }

  // 3. Login / Signup Auth Redirects
  if (pathname === '/login' || pathname === '/signup') {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'OFFICER' ? '/officer/dashboard' : '/applicant/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/applicant/:path*',
    '/officer/:path*',
    '/login',
    '/signup',
  ],
};
