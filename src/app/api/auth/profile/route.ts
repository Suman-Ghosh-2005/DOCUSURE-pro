import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthenticated', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Use Admin client to query profile bypassing RLS recursion
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const resolvedRole = (
      profile?.role ||
      user.user_metadata?.role ||
      'APPLICANT'
    ).toUpperCase();

    console.log('[AUTH DEBUG] login email =', user.email);
    console.log('[AUTH DEBUG] authenticated user id =', user.id);
    console.log('[AUTH DEBUG] authenticated user email =', user.email);
    console.log('[AUTH DEBUG] profile id =', profile?.id || user.id);
    console.log('[AUTH DEBUG] profile role =', resolvedRole);
    console.log('[AUTH DEBUG] officer authorization result =', resolvedRole === 'OFFICER');

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || 'User',
        role: resolvedRole,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Profile resolution error';
    return NextResponse.json(
      { data: null, error: { message, code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
