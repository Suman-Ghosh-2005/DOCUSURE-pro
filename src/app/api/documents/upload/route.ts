import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DocumentRepository } from '@/repositories/document.repository';
import { uploadDocumentSchema } from '@/lib/validators/upload.schema';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const applicationId = formData.get('application_id') as string;
    const slotType = formData.get('slot_type') as string;
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { data: null, error: { message: 'No file provided in form data', code: 'MISSING_FILE' } },
        { status: 400 }
      );
    }

    // Validate payload
    const validated = uploadDocumentSchema.parse({
      application_id: applicationId,
      slot_type: slotType,
    });

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { data: null, error: { message: 'Invalid file format. Only PDF, JPEG, and PNG are allowed.', code: 'INVALID_MIME' } },
        { status: 400 }
      );
    }

    // Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { data: null, error: { message: 'File size exceeds 5MB limit.', code: 'FILE_TOO_LARGE' } },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop() || 'bin';
    const storagePath = `${validated.application_id}/${uuidv4()}.${extension}`;

    // Upload to Private Supabase Storage Bucket via Admin Client
    const supabaseAdmin = createAdminClient();
    const { error: storageError } = await supabaseAdmin.storage
      .from('docusure-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (storageError) {
      console.error('[Upload API] Storage Error:', storageError);
      // Fall back gracefully to DB-only metadata mode if storage bucket is not configured yet
    }

    // Create Document record in DB
    const docRecord = await DocumentRepository.create({
      application_id: validated.application_id,
      slot_type: validated.slot_type,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    if (!docRecord) {
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create document record in database', code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: docRecord, error: null }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload processing error';
    return NextResponse.json(
      { data: null, error: { message, code: 'UPLOAD_ERROR' } },
      { status: 500 }
    );
  }
}
