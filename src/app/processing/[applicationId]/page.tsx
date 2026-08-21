'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  FileScan,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Layers,
  Sparkles,
  Award,
  UserCheck,
  Clock,
} from 'lucide-react';
import { JobStatus, JobStage } from '@/types/job.types';

export default function ProcessingPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);

  // Mount Guard to prevent React Strict Mode duplicate job creation
  const hasMountedRef = useRef(false);

  // Job Queue States
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('QUEUED');
  const [jobStage, setJobStage] = useState<JobStage>('OCR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Application Summaries
  const [ocrSummary, setOcrSummary] = useState<Array<{
    document_id: string;
    slot_type: string;
    word_count: number;
    ocr_confidence: number;
    text_snippet: string;
  }> | null>(null);

  const [extractionSummary, setExtractionSummary] = useState<Array<{
    document_id: string;
    slot_type: string;
    classified_type: string;
    fields_count: number;
    sample_fields: Record<string, string | number | null>;
  }> | null>(null);

  const [eligibilityOverall, setEligibilityOverall] = useState<string | null>(null);
  const [ruleResults, setRuleResults] = useState<Array<{
    rule_id: string;
    rule_name: string;
    status: string;
    reason: string;
  }>>([]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to fetch full application status & persisted extracted fields upon completion
  const loadFullApplicationResults = async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        const app = json.data.application;
        const docs = json.data.documents || [];
        const fields = json.data.extractedFields || [];

        // 1. Map OCR summary
        const ocrData = docs.map((d: { id: string; slot_type: string; ocr_text?: string; ocr_confidence?: number }) => ({
          document_id: d.id,
          slot_type: d.slot_type,
          word_count: d.ocr_text ? d.ocr_text.split(/\s+/).filter(Boolean).length : 0,
          ocr_confidence: d.ocr_confidence ?? 0.95,
          text_snippet: d.ocr_text ? d.ocr_text.substring(0, 100) : '',
        }));
        setOcrSummary(ocrData);

        // 2. Map AI Extraction summary from persisted DB extracted_fields
        const extData = docs.map((d: { id: string; slot_type: string; document_type?: string }) => {
          const docFields = fields.filter((f: { document_id: string }) => f.document_id === d.id);
          const sampleMap: Record<string, string | number | null> = {};
          docFields.forEach((f: { field_name: string; normalized_value?: string | number; raw_value?: string }) => {
            sampleMap[f.field_name] = f.normalized_value ?? f.raw_value ?? null;
          });
          return {
            document_id: d.id,
            slot_type: d.slot_type,
            classified_type: d.document_type || d.slot_type,
            fields_count: docFields.length,
            sample_fields: sampleMap,
          };
        });
        setExtractionSummary(extData);

        // 3. Fetch Rule Audit Results
        const rulesRes = await fetch(`/api/processing/${applicationId}/eligibility`, { method: 'POST' });
        const rulesJson = await rulesRes.json();
        if (rulesRes.ok && rulesJson.data) {
          setEligibilityOverall(rulesJson.data.overallStatus);
          setRuleResults(rulesJson.data.ruleResults || []);
        } else if (app.status === 'VERIFIED' || app.status === 'INELIGIBLE' || app.status === 'EXCEPTION') {
          setEligibilityOverall(
            app.status === 'VERIFIED' ? 'ELIGIBLE' : app.status === 'INELIGIBLE' ? 'INELIGIBLE' : 'REVIEW_REQUIRED'
          );
        }
      }
    } catch (e) {
      console.warn('[ProcessingPage] Could not load final results:', e);
    }
  };

  // STEP 1: Create Job
  const createAndStartJob = async () => {
    setIsProcessing(true);
    setError(null);
    setJobStatus('QUEUED');
    setJobStage('OCR');

    try {
      const res = await fetch(`/api/processing/${applicationId}/jobs`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to initialize processing job');
      }

      const { jobId, status, currentStage } = json.data;
      setActiveJobId(jobId);
      setJobStatus(status);
      setJobStage(currentStage);

      // Start 2-second polling
      startPolling(jobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Job Creation Error';
      console.error('[ProcessingPage] Job Initialization Error:', msg);
      setError(`Job initialization failed: ${msg}`);
      setIsProcessing(false);
    }
  };

  // STEP 2: Poll Job Status every 2 seconds
  const startPolling = (jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/processing/jobs/${jobId}`);
        const json = await res.json();

        if (res.ok && json.data) {
          const { status, currentStage, errorMessage } = json.data;
          setJobStatus(status);
          setJobStage(currentStage);

          if (status === 'COMPLETED') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsProcessing(false);
            await loadFullApplicationResults();
          } else if (status === 'FAILED') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsProcessing(false);
            setError(errorMessage || 'Processing job failed during execution.');
          }
        }
      } catch (err: unknown) {
        console.warn('[ProcessingPage] Polling notice:', err);
      }
    }, 2000);
  };

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    createAndStartJob();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [applicationId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 pb-32">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <FileScan className="w-3.5 h-3.5" />
          <span>DOCUSURE Cloud Asynchronous Job Pipeline (Phase 8A)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Application Document Processing Pipeline
        </h1>
        <p className="text-xs text-slate-500 font-mono">
          Application ID: <span className="font-bold text-slate-800">{applicationId}</span>
          {activeJobId && (
            <span className="ml-3 text-slate-400">
              Job ID: <span className="font-bold text-blue-600">{activeJobId}</span>
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardContent className="p-8 space-y-6">
          {/* Rate Limit Countdown or Active Error State with Retry Button */}
          {error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Asynchronous Job Processing Notice</span>
              </div>
              <p className="text-xs">{error}</p>
              <Button
                size="sm"
                variant="primary"
                onClick={createAndStartJob}
                className="bg-rose-700 hover:bg-rose-600 text-white font-semibold gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Retry Pipeline Job</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Timeline & Job Queue Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>
                      Job Status: <span className="text-blue-700 font-bold uppercase">{jobStatus}</span> ({jobStage})
                    </span>
                  </div>
                  <StatusBadge status={jobStatus === 'COMPLETED' ? 'VERIFIED' : 'PROCESSING'} />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-xs">
                    {jobStage !== 'OCR' && (jobStatus === 'PROCESSING' || jobStatus === 'COMPLETED') ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : jobStage === 'OCR' && isProcessing ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={jobStage !== 'OCR' ? 'font-medium text-slate-900' : 'font-bold text-blue-700'}>
                      1. Server-Side Tesseract.js OCR (Text & Confidence Extraction)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {['VERIFICATION', 'ELIGIBILITY', 'COMPLETED'].includes(jobStage) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : jobStage === 'AI_EXTRACTION' && isProcessing ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={['VERIFICATION', 'ELIGIBILITY', 'COMPLETED'].includes(jobStage) ? 'font-medium text-slate-900' : jobStage === 'AI_EXTRACTION' ? 'font-bold text-blue-700' : 'text-slate-400'}>
                      2. Gemini 3.5 Flash-Lite AI Field Extraction (1 Multi-Doc Request)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {['ELIGIBILITY', 'COMPLETED'].includes(jobStage) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : jobStage === 'VERIFICATION' && isProcessing ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={['ELIGIBILITY', 'COMPLETED'].includes(jobStage) ? 'font-medium text-slate-900' : jobStage === 'VERIFICATION' ? 'font-bold text-blue-700' : 'text-slate-400'}>
                      3. Deterministic Cross-Document Levenshtein Verification Engine
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {jobStatus === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : jobStage === 'ELIGIBILITY' && isProcessing ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={jobStatus === 'COMPLETED' ? 'font-medium text-slate-900' : jobStage === 'ELIGIBILITY' ? 'font-bold text-blue-700' : 'text-slate-400'}>
                      4. Deterministic Scheme Eligibility Rule Engine & Exceptions Audit
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage 1 OCR Output Table */}
              {ocrSummary && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Phase 3 Extracted OCR Text & Confidence Summary</span>
                  </h4>

                  <div className="space-y-3">
                    {ocrSummary.map((item) => (
                      <div
                        key={item.document_id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 uppercase">{item.slot_type}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-mono">
                              Words: <strong>{item.word_count}</strong>
                            </span>
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                                item.ocr_confidence >= 0.8
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.ocr_confidence >= 0.6
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Conf: {(item.ocr_confidence * 100).toFixed(1)}% ({item.ocr_confidence.toFixed(3)})
                            </span>
                          </div>
                        </div>

                        <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 break-all leading-relaxed">
                          {item.text_snippet ? `"${item.text_snippet}..."` : '(No text extracted)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage 2 Gemini AI Extraction Summary */}
              {extractionSummary && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Phase 4 Gemini Extracted & Normalized Structured Fields</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {extractionSummary.map((item) => (
                      <div key={item.document_id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 uppercase">{item.slot_type}</span>
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                            Fields: {item.fields_count}
                          </span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px] bg-white p-2 rounded border border-slate-200">
                          {Object.entries(item.sample_fields).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-slate-500">{k}:</span>
                              <strong className="text-slate-900">{v !== null ? String(v) : 'null'}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage 3 & 4 Verification & Rules Summary */}
              {jobStatus === 'COMPLETED' && eligibilityOverall && (
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <div
                    className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
                      eligibilityOverall === 'ELIGIBLE'
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                        : eligibilityOverall === 'INELIGIBLE'
                        ? 'bg-rose-50 text-rose-950 border-rose-300'
                        : 'bg-amber-50 text-amber-950 border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 shrink-0 text-emerald-700" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                          Automated Pipeline System Recommendation
                        </span>
                        <h3 className="text-base font-bold">
                          {eligibilityOverall === 'ELIGIBLE'
                            ? '✓ SYSTEM RECOMMENDATION: ELIGIBLE'
                            : eligibilityOverall === 'INELIGIBLE'
                            ? '✕ SYSTEM RECOMMENDATION: INELIGIBLE'
                            : '⚠ SYSTEM RECOMMENDATION: REVIEW REQUIRED'}
                        </h3>
                      </div>
                    </div>

                    <Link href={`/officer/applications/${applicationId}`}>
                      <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Open Officer Workspace (Phase 7)</span>
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Phase 6 Scheme Eligibility Rule Audit Trail</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      {ruleResults.map((r) => (
                        <div key={r.rule_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">{r.rule_name}</span>
                            <span className="text-slate-500 text-[11px]">{r.reason}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded font-mono ${
                              r.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'FAIL'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
