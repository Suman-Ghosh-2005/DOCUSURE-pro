import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch document metadata
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .select('id, storage_path, original_filename, mime_type')
      .eq('id', id)
      .single();

    if (dbError || !document || !document.storage_path) {
      return NextResponse.json(
        { data: null, error: { message: 'Document or storage path not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Generate 15-minute (900 seconds) signed URL from private bucket
    const supabaseAdmin = createAdminClient();
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('docusure-documents')
      .createSignedUrl(document.storage_path, 900);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json(
        { data: null, error: { message: 'Failed to generate signed URL', code: 'STORAGE_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        document_id: document.id,
        signed_url: signedData.signedUrl,
        expires_in_seconds: 900,
        original_filename: document.original_filename,
        mime_type: document.mime_type,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json(
      { data: null, error: { message, code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
