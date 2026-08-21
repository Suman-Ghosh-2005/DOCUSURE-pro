import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { data: null, error: { message: 'Full name is required', code: 'INVALID_NAME' } },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { data: null, error: { message: 'Valid email address is required', code: 'INVALID_EMAIL' } },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { data: null, error: { message: 'Password must be at least 6 characters long', code: 'INVALID_PASSWORD' } },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Create real Supabase Auth user with email_confirm = true via Admin Auth API (skips email sending)
    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: 'APPLICANT',
      },
    });

    if (createError) {
      // If user already exists, check if error indicates duplicate
      const errorMsg = createError.message || 'Failed to create user account';
      return NextResponse.json(
        { data: null, error: { message: errorMsg, code: 'AUTH_CREATE_ERROR' } },
        { status: 400 }
      );
    }

    const user = authData.user;
    if (!user) {
      throw new Error('User creation returned empty payload');
    }

    // Ensure profile row is inserted/updated with role = APPLICANT
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'APPLICANT',
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.warn('[Admin Signup] Profile upsert warning:', profileError);
    }

    return NextResponse.json({
      data: {
        userId: user.id,
        email: user.email,
        name: name.trim(),
        role: 'APPLICANT',
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup error';
    console.error('[Server Signup Route Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'SIGNUP_ERROR' } },
      { status: 500 }
    );
  }
}
