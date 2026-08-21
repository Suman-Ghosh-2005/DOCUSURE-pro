import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { Application } from '@/types/application.types';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let applications: Application[] = [];

    if (profile?.role === 'OFFICER') {
      // Officer workstation sees the full review queue
      applications = await ApplicationRepository.listAll();
    } else if (user) {
      // Authenticated Applicant sees ONLY their strictly owned applications
      applications = await ApplicationRepository.getByUserId(user.id);
    } else {
      // Unauthenticated callers receive no private application data
      applications = [];
    }

    return NextResponse.json({
      data: applications,
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch applications';
    console.error('[Applications API GET Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, dob, gender, scheme_id } = body;

    if (!applicant_name) {
      return NextResponse.json(
        { data: null, error: { message: 'Applicant name is required', code: 'INVALID_INPUT' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const application = await ApplicationRepository.create({
      applicant_user_id: user?.id || null,
      applicant_name,
      dob,
      gender,
      scheme_id: scheme_id || 'wb-merit-scholarship-v1',
    });

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create application record', code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: application, error: null },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create application';
    console.error('[Applications API POST Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'CREATE_ERROR' } },
      { status: 500 }
    );
  }
}
