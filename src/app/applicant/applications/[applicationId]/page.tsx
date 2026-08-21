'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { DEMO_SCENARIOS } from '@/lib/constants/demo-scenarios';
import { DEFAULT_SCHEME_NAME } from '@/lib/constants/default-rules';
import { DocumentSlotType } from '@/types/document.types';
import { ApplicationStatus } from '@/types/application.types';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  ShieldCheck,
  FileCheck,
  Lock,
  Trash2,
  Check,
  XCircle,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface UploadSlotState {
  slotType: DocumentSlotType;
  label: string;
  description: string;
  isUploaded: boolean;
  filename?: string;
  fileSize?: string;
  isUploading: boolean;
  error?: string;
}

export default function ApplicantDocumentUploadPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const router = useRouter();

  const [applicantName, setApplicantName] = useState('Applicant');
  const [accessForbidden, setAccessForbidden] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appStatus, setAppStatus] = useState<ApplicationStatus | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);

  const [slots, setSlots] = useState<UploadSlotState[]>([
    { slotType: 'ID_PROOF', label: '1. Identity Document (Aadhaar / Voter ID)', description: 'Government issued photo identity document (PDF)', isUploaded: false, isUploading: false },
    { slotType: 'INCOME_CERT', label: '2. Income Certificate', description: 'Revenue Officer / BDO issued income statement (PDF)', isUploaded: false, isUploading: false },
    { slotType: 'MARKSHEET', label: '3. Academic Marksheet', description: 'Board/university examination mark statement (PDF)', isUploaded: false, isUploading: false },
    { slotType: 'DOMICILE_CERT', label: '4. Domicile Certificate', description: 'Permanent resident certificate issued by competent authority (PDF)', isUploaded: false, isUploading: false },
  ]);

  // Fetch initial application state
  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await fetch(`/api/applications/${applicationId}`);
        if (res.status === 403) {
          setAccessForbidden(true);
          return;
        }

        const json = await res.json();
        if (res.ok && json.data) {
          setApplicantName(json.data.application.applicant_name);
          setAppStatus(json.data.application.status as ApplicationStatus);
          setRoutingReason(json.data.application.routing_reason);

          const docs = json.data.documents || [];

          setSlots((prev) =>
            prev.map((slot) => {
              const uploaded = docs.find((d: any) => d.slot_type === slot.slotType);
              if (uploaded) {
                return {
                  ...slot,
                  isUploaded: true,
                  filename: uploaded.original_filename || `${slot.slotType}.pdf`,
                };
              }
              return slot;
            })
          );
        }
      } catch (e) {
        console.warn('[UploadPage] Error fetching documents:', e);
      }
    };

    fetchApp();
  }, [applicationId]);

  if (accessForbidden) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 — Access Denied</h2>
        <p className="text-xs text-slate-600">
          You do not have permission to view or modify this application because it belongs to another registered applicant.
        </p>
        <Link href="/applicant/dashboard">
          <Button size="sm" className="bg-slate-900 text-white text-xs">
            Return to My Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Handle Manual File Upload via File Input Picker
  const handleManualFileUpload = async (slotType: DocumentSlotType, file: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }

    setSlots((prev) =>
      prev.map((s) => (s.slotType === slotType ? { ...s, isUploading: true, error: undefined } : s))
    );

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('application_id', applicationId);
      formData.append('slot_type', slotType);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to upload document file');
      }

      const formattedSize = `${(file.size / 1024).toFixed(1)} KB`;

      setSlots((prev) =>
        prev.map((s) =>
          s.slotType === slotType
            ? { ...s, isUploaded: true, filename: file.name, fileSize: formattedSize, isUploading: false }
            : s
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setSlots((prev) =>
        prev.map((s) => (s.slotType === slotType ? { ...s, isUploading: false, error: msg } : s))
      );
    }
  };

  // Upload Synthetic Demo PDF (Secondary Demo Utility)
  const handleUploadSyntheticPDF = async (slotType: DocumentSlotType) => {
    setSlots((prev) =>
      prev.map((s) => (s.slotType === slotType ? { ...s, isUploading: true, error: undefined } : s))
    );

    try {
      const docDef = DEMO_SCENARIOS.SCENARIO_1_VALID.documents.find((d) => d.slotType === slotType);
      if (!docDef) throw new Error('Document slot definition not found');

      const pdfBuffer = generateSyntheticPDF({
        ...docDef,
        fields: {
          ...docDef.fields,
          ...(applicantName ? { applicant_name: applicantName } : {}),
        },
      });

      const file = new File([new Uint8Array(pdfBuffer)], `${slotType.toLowerCase()}_synthetic.pdf`, {
        type: 'application/pdf',
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('application_id', applicationId);
      formData.append('slot_type', slotType);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to upload document');
      }

      setSlots((prev) =>
        prev.map((s) =>
          s.slotType === slotType
            ? { ...s, isUploaded: true, filename: file.name, fileSize: '14.2 KB', isUploading: false }
            : s
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setSlots((prev) =>
        prev.map((s) => (s.slotType === slotType ? { ...s, isUploading: false, error: msg } : s))
      );
    }
  };

  // Upload All Synthetic PDFs Demo Shortcut
  const handleUploadAllSynthetic = async () => {
    for (const slot of slots) {
      if (!slot.isUploaded) {
        await handleUploadSyntheticPDF(slot.slotType);
      }
    }
  };

  const allUploaded = slots.every((s) => s.isUploaded);

  // CITIZEN RESULT PRESENTATION VIEW (when officer decision exists)
  if (appStatus === 'APPROVED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xl">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Official Citizen Notification
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950 flex items-center justify-center gap-2">
                <span>✅ APPLICATION APPROVED</span>
              </h1>
              <p className="text-xs text-emerald-900 max-w-md mx-auto font-medium">
                Congratulations! Your scholarship application has passed all document verification checks and has been officially approved by the reviewing officer.
              </p>
            </div>

            <div className="p-4 bg-white border border-emerald-200 rounded-xl space-y-2.5 text-left text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Scheme Name:</span>
                <span className="font-bold text-slate-900">{DEFAULT_SCHEME_NAME}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Application ID:</span>
                <span className="font-bold text-blue-700">{applicationId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Officer Decision:</span>
                <span className="font-bold text-emerald-700">Approved by reviewing officer</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Documents Submitted:</span>
                <span className="font-bold text-slate-800">4 / 4 Slots Complete</span>
              </div>
              {routingReason && (
                <div className="pt-2 text-xs font-sans text-slate-800">
                  <strong className="text-slate-900 block font-mono text-[10px] uppercase text-slate-400">Officer Note:</strong>
                  <p className="mt-0.5 p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-950 font-medium">{routingReason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Link href="/applicant/dashboard">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-6">
                  Back to Applicant Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appStatus === 'REJECTED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card className="border-rose-200 bg-rose-50/40 shadow-2xl">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Official Citizen Notification
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-rose-950 flex items-center justify-center gap-2">
                <span>❌ APPLICATION NOT APPROVED</span>
              </h1>
              <p className="text-xs text-rose-900 max-w-md mx-auto font-medium">
                Your application was reviewed by the scheme officer and could not be approved based on the submitted evidence.
              </p>
            </div>

            <div className="p-4 bg-white border border-rose-200 rounded-xl space-y-2.5 text-left text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Scheme Name:</span>
                <span className="font-bold text-slate-900">{DEFAULT_SCHEME_NAME}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Application ID:</span>
                <span className="font-bold text-blue-700">{applicationId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Officer Decision:</span>
                <span className="font-bold text-rose-700">Rejected</span>
              </div>
              {routingReason && (
                <div className="pt-2 text-xs font-sans text-slate-800">
                  <strong className="text-slate-900 block font-mono text-[10px] uppercase text-slate-400">Officer Note:</strong>
                  <p className="mt-0.5 p-2 bg-rose-50 rounded border border-rose-200 text-rose-950 font-medium">{routingReason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Link href="/applicant/dashboard">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-6">
                  Back to Applicant Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Post-Submission Intake Screen
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xl">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Application Intake Confirmation
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Application Submitted Successfully
              </h1>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your application documents have been stored and queued into the DOCUSURE verification pipeline.
              </p>
            </div>

            <div className="p-4 bg-white border border-emerald-200 rounded-xl space-y-2 text-left text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Application ID:</span>
                <span className="font-bold text-slate-900">{applicationId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Target Scheme:</span>
                <span className="font-bold text-blue-700">{DEFAULT_SCHEME_NAME}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Documents Submitted:</span>
                <span className="font-bold text-emerald-700">4 / 4 Slots Complete</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">SUBMITTED (Pending Automated Verification)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href={`/applicant/applications/${applicationId}/processing`} className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 gap-2">
                  <span>View Processing Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>

              <Link href="/applicant/dashboard" className="w-full">
                <Button variant="outline" className="w-full text-xs border-slate-300 text-slate-700 py-2.5">
                  Back to Applicant Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/applicant/dashboard"
        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Applicant Dashboard
      </Link>

      {/* Action Required Banner if Exception / Incomplete */}
      {(appStatus === 'EXCEPTION' || appStatus === 'INCOMPLETE') && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>⚠ ACTION REQUIRED — Document Correction Recommended</span>
          </div>
          <p className="text-xs">
            Officer / Verification Note: <strong>{routingReason || 'Please replace or verify uploaded document files below.'}</strong>
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Document Workspace (Step 2 of 3)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Upload Required Application Documents
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Applicant Name: <strong className="text-slate-800">{applicantName}</strong> | Application ID: <span className="font-bold text-blue-600">{applicationId}</span>
          </p>
        </div>

        {/* Secondary Developer / Demo Utility */}
        <Button
          onClick={handleUploadAllSynthetic}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Demo: Auto-Fill Synthetic PDFs</span>
        </Button>
      </div>

      {/* Document Upload Slots */}
      <div className="grid grid-cols-1 gap-4">
        {slots.map((slot) => (
          <Card key={slot.slotType} className={`border ${slot.isUploaded ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'}`}>
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{slot.label}</span>
                  {slot.isUploaded && (
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{slot.description}</p>
                {slot.filename && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-700 font-bold bg-white p-2 rounded border border-emerald-200">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{slot.filename}</span>
                    {slot.fileSize && <span className="text-slate-400 font-normal">({slot.fileSize})</span>}
                  </div>
                )}
                {slot.error && <p className="text-xs text-rose-600 font-semibold">{slot.error}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {slot.isUploaded ? (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleManualFileUpload(slot.slotType, file);
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace File</span>
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Primary Manual File Input Picker */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleManualFileUpload(slot.slotType, file);
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose File</span>
                      </span>
                    </label>

                    {/* Secondary Sample PDF Button */}
                    <Button
                      onClick={() => handleUploadSyntheticPDF(slot.slotType)}
                      isLoading={slot.isUploading}
                      variant="outline"
                      size="sm"
                      className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      Sample PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submission Control Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div>
          <h3 className="text-sm font-bold">Submit Application Documents</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {allUploaded
              ? 'All 4 required document slots uploaded. Click to complete submission.'
              : 'Please upload all 4 document slots above to enable submission.'}
          </p>
        </div>

        <Button
          onClick={() => setSubmitted(true)}
          disabled={!allUploaded}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-2 px-6 py-2.5 shadow-lg disabled:opacity-50"
        >
          <span>Submit Application</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
