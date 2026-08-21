import { NextResponse } from 'next/server';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import { DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { createAdminClient } from '@/lib/supabase/server';
import { loadScenarioSchema } from '@/lib/validators/upload.schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = loadScenarioSchema.parse(body);
    const scenarioConfig = DEMO_SCENARIOS[validated.scenario_id as DemoScenarioId];

    if (!scenarioConfig) {
      return NextResponse.json(
        { data: null, error: { message: 'Unknown scenario ID', code: 'INVALID_SCENARIO' } },
        { status: 400 }
      );
    }

    // 1. Create Application Record
    const application = await ApplicationRepository.create({
      applicant_name: scenarioConfig.applicantName,
      dob: scenarioConfig.dob,
      gender: scenarioConfig.gender,
      scheme_id: DEFAULT_SCHEME_ID,
    });

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create application record for demo scenario', code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const createdDocIds: string[] = [];

    // 2. Generate Synthetic PDFs & Upload to Supabase Storage + DB
    for (const docDef of scenarioConfig.documents) {
      const pdfBuffer = generateSyntheticPDF(docDef);
      const filename = `${docDef.slotType.toLowerCase()}_synthetic.pdf`;
      const storagePath = `${application.id}/${uuidv4()}.pdf`;

      // Upload to Supabase Private Storage Bucket
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('docusure-documents')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadErr) {
        console.warn(`[Demo Scenario Generator] Storage upload notice for ${docDef.slotType}:`, uploadErr.message);
      }

      // Create Document Record
      const docRecord = await DocumentRepository.create({
        application_id: application.id,
        slot_type: docDef.slotType,
        storage_path: storagePath,
        original_filename: filename,
        mime_type: 'application/pdf',
        file_size_bytes: pdfBuffer.length,
      });

      if (docRecord) {
        createdDocIds.push(docRecord.id);
      }
    }

    return NextResponse.json(
      {
        data: {
          application_id: application.id,
          scenario_id: scenarioConfig.id,
          scenario_name: scenarioConfig.name,
          documents_created: createdDocIds.length,
          redirect_url: `/apply/${application.id}/upload?scenario=${scenarioConfig.id}`,
        },
        error: null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate demo scenario';
    console.error('[Demo Scenario Loader API Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'SCENARIO_ERROR' } },
      { status: 500 }
    );
  }
}
