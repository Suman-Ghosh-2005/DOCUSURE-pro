import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { UserProfile, UserRole } from '@/types/auth.types';

// Polyfill WebSocket for Node environment to prevent Realtime WebSocket initialization notices
if (typeof window === 'undefined' && !globalThis.WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

/**
 * Standard Server Client (respects user cookies/RLS)
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[DOCUSURE] Supabase server credentials missing in environment.');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Handled in server components
        }
      },
    },
  });
}

/**
 * Admin Service Client (SERVER SIDE ONLY)
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for system operations.
 * NEVER call this on the client or expose SUPABASE_SERVICE_ROLE_KEY to browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[DOCUSURE Admin] SUPABASE_SERVICE_ROLE_KEY missing in server environment.');
  }

  return createSupabaseDirectClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Helper to fetch the authenticated user and profile from server context
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      return profile as UserProfile;
    }

    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: (user.user_metadata?.role as UserRole) || 'APPLICANT',
      created_at: user.created_at,
    };
  } catch {
    return null;
  }
}
