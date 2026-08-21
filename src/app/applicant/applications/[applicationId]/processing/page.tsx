'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ApplicationStatus } from '@/types/application.types';
import { DEFAULT_SCHEME_NAME } from '@/lib/constants/default-rules';
import {
  FileScan,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Award,
  Clock,
  ArrowLeft,
  Lock,
  User,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { JobStatus, JobStage } from '@/types/job.types';

export default function ApplicantProcessingPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const hasMountedRef = useRef(false);

  // Job Queue States
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('QUEUED');
  const [jobStage, setJobStage] = useState<JobStage>('OCR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessForbidden, setAccessForbidden] = useState(false);

  // Application Results
  const [applicantName, setApplicantName] = useState<string>('Applicant');
  const [appStatus, setAppStatus] = useState<ApplicationStatus | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);
  const [auditVerified, setAuditVerified] = useState(true);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadApplicationSummary = async () => {
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
        if (json.data.auditVerification) {
          setAuditVerified(json.data.auditVerification.valid);
        }
      }
    } catch (e) {
      console.warn('[ApplicantProcessing] Could not load summary:', e);
    }
  };

  const createAndStartJob = async () => {
    setIsProcessing(true);
    setError(null);
    setJobStatus('QUEUED');
    setJobStage('OCR');

    try {
      const res = await fetch(`/api/processing/${applicationId}/jobs`, { method: 'POST' });
      if (res.status === 403) {
        setAccessForbidden(true);
        setIsProcessing(false);
        return;
      }

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to initialize processing job');
      }

      const { jobId, status, currentStage } = json.data;
      setActiveJobId(jobId);
      setJobStatus(status);
      setJobStage(currentStage);

      startPolling(jobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Job Creation Error';
      setError(`Job initialization failed: ${msg}`);
      setIsProcessing(false);
    }
  };

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
            await loadApplicationSummary();
          } else if (status === 'FAILED') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsProcessing(false);
            setError(errorMessage || 'Processing job failed during execution.');
          }
        }
      } catch (err: unknown) {
        console.warn('[ApplicantProcessing] Polling notice:', err);
      }
    }, 2000);
  };

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    createAndStartJob();
    loadApplicationSummary();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [applicationId]);

  if (accessForbidden) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 — Access Denied</h2>
        <p className="text-xs text-slate-600">
          You do not have permission to view or execute processing for this application because it belongs to another registered applicant.
        </p>
        <Link href="/applicant/dashboard">
          <Button size="sm" className="bg-slate-900 text-white text-xs">
            Return to My Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const isStageDone = (targetStage: string) => {
    if (jobStatus === 'COMPLETED') return true;
    const stages = ['OCR', 'AI_EXTRACTION', 'VERIFICATION', 'ELIGIBILITY', 'RISK', 'COMPLETED'];
    const currentIdx = stages.indexOf(jobStage);
    const targetIdx = stages.indexOf(targetStage);
    return currentIdx > targetIdx;
  };

  const isStageCurrent = (targetStage: string) => {
    return isProcessing && jobStage === targetStage;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/applicant/dashboard"
        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Applicant Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verification Pipeline Progress</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Application Verification Pipeline
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Application ID: <span className="font-bold text-slate-800">{applicationId}</span>
            {activeJobId && (
              <span className="ml-3 text-slate-400">
                Job ID: <span className="font-bold text-blue-600">{activeJobId}</span>
              </span>
            )}
          </p>
        </div>

        {appStatus && <StatusBadge status={appStatus} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Profile Summary Card */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-slate-50/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{applicantName}</h3>
                  <span className="text-[11px] font-mono text-slate-500">Applicant Citizen</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Scheme</span>
                  <span className="font-semibold text-slate-800">{DEFAULT_SCHEME_NAME}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pipeline Status</span>
                  <span className="font-semibold text-blue-700">
                    {jobStatus === 'COMPLETED' ? 'Processing Complete — Awaiting Officer Review' : `Under Processing (${jobStage})`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Concise Citizen Explanation Note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Your documents are processed through DOCUSURE's cloud verification pipeline. Final decisions remain with authorized officers.
            </p>
          </div>
        </div>

        {/* Right Column (2 cols): Stages Pipeline Progress */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-md">
            <CardContent className="p-6 space-y-6">
              {error ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Processing Pipeline Notice</span>
                  </div>
                  <p className="text-xs">{error}</p>
                  <Button size="sm" onClick={createAndStartJob} className="bg-rose-700 text-white text-xs">
                    Retry Verification Job
                  </Button>
                </div>
              ) : (
                <>
                  {/* Job Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${jobStatus === 'PROCESSING' ? 'text-blue-600 animate-spin' : 'text-emerald-600'}`} />
                      <span>
                        APPLICATION STATUS:{' '}
                        <strong className="text-blue-700 uppercase">
                          {jobStatus === 'COMPLETED' ? 'Completed — Awaiting Officer Review' : 'Under Processing'}
                        </strong>
                      </span>
                    </h2>
                  </div>

                  {/* Requested Pipeline Stages */}
                  <div className="space-y-3">
                    {/* Stage 1: Application Submitted */}
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">✓ Application Submitted</span>
                    </div>

                    {/* Stage 2: Documents Secured */}
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">✓ Documents Secured</span>
                    </div>

                    {/* Stage 3: Cloud Job Queued */}
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">✓ Cloud Job Queued</span>
                    </div>

                    {/* Stage 4: OCR & Text Extraction */}
                    <div className="flex items-center gap-3 text-xs">
                      {isStageDone('OCR') ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : isStageCurrent('OCR') ? (
                        <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isStageDone('OCR') ? 'font-semibold text-slate-900' : isStageCurrent('OCR') ? 'font-bold text-blue-700' : 'text-slate-400'}>
                        {isStageDone('OCR') ? '✓' : '•'} OCR & Text Extraction
                      </span>
                    </div>

                    {/* Stage 5: AI Document Intelligence */}
                    <div className="flex items-center gap-3 text-xs">
                      {isStageDone('AI_EXTRACTION') ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : isStageCurrent('AI_EXTRACTION') ? (
                        <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isStageDone('AI_EXTRACTION') ? 'font-semibold text-slate-900' : isStageCurrent('AI_EXTRACTION') ? 'font-bold text-blue-700' : 'text-slate-400'}>
                        {isStageDone('AI_EXTRACTION') ? '✓' : '•'} AI Document Intelligence (Single Request)
                      </span>
                    </div>

                    {/* Stage 6: Cross-Document Verification */}
                    <div className="flex items-center gap-3 text-xs">
                      {isStageDone('VERIFICATION') ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : isStageCurrent('VERIFICATION') ? (
                        <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isStageDone('VERIFICATION') ? 'font-semibold text-slate-900' : isStageCurrent('VERIFICATION') ? 'font-bold text-blue-700' : 'text-slate-400'}>
                        {isStageDone('VERIFICATION') ? '✓' : '•'} Cross-Document Verification
                      </span>
                    </div>

                    {/* Stage 7: Eligibility Evaluation */}
                    <div className="flex items-center gap-3 text-xs">
                      {isStageDone('ELIGIBILITY') ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : isStageCurrent('ELIGIBILITY') ? (
                        <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isStageDone('ELIGIBILITY') ? 'font-semibold text-slate-900' : isStageCurrent('ELIGIBILITY') ? 'font-bold text-blue-700' : 'text-slate-400'}>
                        {isStageDone('ELIGIBILITY') ? '✓' : '•'} Eligibility Evaluation
                      </span>
                    </div>

                    {/* Stage 8: ML Risk Assessment */}
                    <div className="flex items-center gap-3 text-xs">
                      {isStageDone('RISK') ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : isStageCurrent('RISK') ? (
                        <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isStageDone('RISK') ? 'font-semibold text-slate-900' : isStageCurrent('RISK') ? 'font-bold text-blue-700' : 'text-slate-400'}>
                        {isStageDone('RISK') ? '✓' : '•'} ML Risk Assessment & SHA-256 Audit Seal
                      </span>
                    </div>

                    {/* Stage 9: Awaiting Officer Review */}
                    <div className="flex items-center gap-3 text-xs">
                      {jobStatus === 'COMPLETED' ? (
                        <RefreshCw className="w-4.5 h-4.5 text-amber-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={jobStatus === 'COMPLETED' ? 'font-bold text-amber-800' : 'text-slate-400'}>
                        ⟳ Awaiting Officer Review
                      </span>
                    </div>

                    {/* Stage 10: Final Decision */}
                    <div className="flex items-center gap-3 text-xs">
                      {['APPROVED', 'REJECTED'].includes(appStatus || '') ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={['APPROVED', 'REJECTED'].includes(appStatus || '') ? 'font-bold text-emerald-800' : 'text-slate-400'}>
                        {['APPROVED', 'REJECTED'].includes(appStatus || '') ? '✓' : '•'} Final Decision ({appStatus || 'Pending'})
                      </span>
                    </div>
                  </div>

                  {/* Completion Banner */}
                  {jobStatus === 'COMPLETED' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-emerald-600" />
                            Processing Complete
                          </h3>
                          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" /> Cryptographic Audit Sealed
                          </span>
                        </div>
                        {routingReason && <p><strong>Status Note:</strong> {routingReason}</p>}
                        <p className="text-[11px] text-emerald-800">
                          Your documents are processed through DOCUSURE's cloud verification pipeline. Final decisions remain with authorized officers.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Link href="/applicant/dashboard">
                          <Button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                            Return to Applicant Dashboard
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
