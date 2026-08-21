'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DocumentSlotCard } from '@/components/document/DocumentSlotCard';
import { DocumentChecklist } from '@/components/document/DocumentChecklist';
import { SCHOLARSHIP_DOCUMENT_SLOTS } from '@/lib/constants/document-types';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import { Application } from '@/types/application.types';
import { DocumentRecord } from '@/types/document.types';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User,
  Sparkles,
  AlertTriangle,
  Loader2,
  FileCheck2,
} from 'lucide-react';

export default function DocumentUploadPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario') as DemoScenarioId | null;

  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scenarioConfig = scenarioId && DEMO_SCENARIOS[scenarioId] ? DEMO_SCENARIOS[scenarioId] : null;

  const fetchApplicationData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/applications/${applicationId}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to fetch application details');
      }

      setApplication(json.data.application);
      setDocuments(json.data.documents || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading application';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationData();
  }, [applicationId]);

  const handleDocumentUploaded = (newDoc: DocumentRecord) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.slot_type !== newDoc.slot_type);
      return [...filtered, newDoc];
    });
  };

  const handleStartVerification = async () => {
    setIsSubmitting(true);
    try {
      // In Phase 2: Actionable transition to Processing screen (/processing/[id])
      router.push(`/processing/${applicationId}`);
    } catch (err: unknown) {
      console.error('Failed to navigate:', err);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading application workspace...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Application Not Found</h2>
        <p className="text-xs text-slate-600">{error || 'The requested application ID does not exist.'}</p>
        <Link href="/">
          <Button variant="outline">Return to Landing Page</Button>
        </Link>
      </div>
    );
  }

  const uploadedCount = documents.length;
  const isMissingDocScenario = scenarioId === 'SCENARIO_4_MISSING_DOC';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Scenario Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Overview
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Application Document Workspace
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Application ID: <span className="font-bold text-slate-800">{application.id}</span>
          </p>
        </div>

        {/* Demo Scenario Badge */}
        {scenarioConfig && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Loaded Hackathon Demo Scenario
              </span>
              <span className="text-xs font-bold text-slate-900">{scenarioConfig.name}</span>
              <p className="text-[11px] text-slate-600 line-clamp-1">{scenarioConfig.description}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (4 cols): Applicant Details + Checklist */}
        <div className="lg:col-span-4 space-y-6">
          {/* Applicant Info Card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{application.applicant_name}</h3>
                  <span className="text-[11px] text-slate-500">Applicant</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Date of Birth:</span>
                  <span className="font-semibold text-slate-800">{application.dob || '14/03/2004'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Gender:</span>
                  <span className="font-semibold text-slate-800">{application.gender || 'Female'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Target Scheme:</span>
                  <span className="font-semibold text-blue-700">WB State Merit Scholarship</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardContent className="p-5">
              <DocumentChecklist documents={documents} />
            </CardContent>
          </Card>

          {/* Notice for Missing Document Scenario */}
          {isMissingDocScenario && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
              <div>
                <strong>Missing Document Scenario Active:</strong> Income Certificate is intentionally omitted. Click "Verify Application" to demonstrate automated missing document detection in the pipeline.
              </div>
            </div>
          )}
        </div>

        {/* Right Column (8 cols): 4 Document Slot Cards */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Submitted Document Slots ({uploadedCount}/4)</span>
            </h3>
            <span className="text-xs text-slate-500">Click any slot to upload or replace</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCHOLARSHIP_DOCUMENT_SLOTS.map((slot) => {
              const existingDoc = documents.find((d) => d.slot_type === slot.slotType);
              return (
                <DocumentSlotCard
                  key={slot.slotType}
                  config={slot}
                  applicationId={application.id}
                  existingDocument={existingDoc}
                  onUploadSuccess={handleDocumentUploaded}
                />
              );
            })}
          </div>

          {/* Bottom Bar: Actionable Verify Button */}
          <Card className="bg-slate-900 text-white border-slate-800">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Ready to Run Verification Pipeline?
                </h4>
                <p className="text-xs text-slate-300">
                  {uploadedCount === 4
                    ? 'All 4 document slots ready. Pipeline will run OCR, extraction & verification.'
                    : `${uploadedCount}/4 documents loaded. Actionable for hackathon missing-document test.`}
                </p>
              </div>

              {/* Verify Button is ACTIONABLE regardless of missing documents (User Correction 1) */}
              <Button
                onClick={handleStartVerification}
                isLoading={isSubmitting}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap"
              >
                <span>Verify Application</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
