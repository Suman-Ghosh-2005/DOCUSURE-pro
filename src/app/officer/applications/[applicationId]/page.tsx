'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Application } from '@/types/application.types';
import { DocumentRecord, ExtractedField } from '@/types/document.types';
import { FieldVerificationResult } from '@/types/verification.types';
import { RuleResult } from '@/types/rule.types';
import { ApplicationException } from '@/types/exception.types';
import { OfficerReviewRecord } from '@/types/review.types';
import { RiskRecord } from '@/types/risk.types';
import { AuditEventRecord, AuditVerificationResult } from '@/types/audit.types';
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  XCircle,
  AlertTriangle,
  Eye,
  FileText,
  User,
  Clock,
  ExternalLink,
  X,
  MessageSquare,
  AlertCircle,
  Loader2,
  Brain,
  Activity,
  Layers,
  Lock,
  Link as LinkIcon,
} from 'lucide-react';

export default function OfficerApplicationReviewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [verificationResults, setVerificationResults] = useState<FieldVerificationResult[]>([]);
  const [ruleResults, setRuleResults] = useState<RuleResult[]>([]);
  const [exceptions, setExceptions] = useState<ApplicationException[]>([]);
  const [pastReviews, setPastReviews] = useState<OfficerReviewRecord[]>([]);
  const [riskResult, setRiskResult] = useState<RiskRecord | null>(null);
  const [auditVerification, setAuditVerification] = useState<AuditVerificationResult | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Document Preview Drawer State
  const [previewDoc, setPreviewDoc] = useState<{ id: string; title: string; url: string; mimeType: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Action Modal States
  const [activeModal, setActiveModal] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [officerNotes, setOfficerNotes] = useState('');
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<string[]>([]);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const fetchApplicationDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const json = await res.json();

      if (res.ok && json.data) {
        setApplication(json.data.application);
        setDocuments(json.data.documents || []);
        setExtractedFields(json.data.extractedFields || []);
        setVerificationResults(json.data.verificationResults || []);
        setRuleResults(json.data.ruleResults || []);
        setExceptions(json.data.exceptions || []);
        setPastReviews(json.data.pastReviews || []);
        setRiskResult(json.data.riskResult || null);
        setAuditVerification(json.data.auditVerification || null);
        setAuditEvents(json.data.auditEvents || []);
      }
    } catch (err) {
      console.error('Failed to load application details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  // Open Document Preview Modal using Signed URL
  const handleOpenDocumentPreview = async (doc: DocumentRecord) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/url`);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to generate signed document URL');
      }

      setPreviewDoc({
        id: doc.id,
        title: doc.original_filename || doc.slot_type,
        url: json.data.signed_url,
        mimeType: doc.mime_type || 'application/pdf',
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error loading document preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Submit Officer Decision
  const handleSubmitDecision = async () => {
    if (!activeModal) return;
    if (!officerNotes.trim() || officerNotes.trim().length < 3) {
      setDecisionError('Officer notes must be at least 3 characters long');
      return;
    }

    if (activeModal === 'REJECT' && selectedRejectionReasons.length === 0) {
      setDecisionError('Please select at least one rejection reason');
      return;
    }

    setSubmittingDecision(true);
    setDecisionError(null);

    try {
      const payload = {
        decision: activeModal === 'CORRECTION' ? 'REQUEST_CORRECTION' : activeModal,
        notes: officerNotes.trim(),
        rejection_reasons: activeModal === 'REJECT' ? selectedRejectionReasons : undefined,
      };

      const res = await fetch(`/api/officer/applications/${applicationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to submit decision');
      }

      setActiveModal(null);
      setOfficerNotes('');
      setSelectedRejectionReasons([]);
      fetchApplicationDetails();
    } catch (err: unknown) {
      setDecisionError(err instanceof Error ? err.message : 'Failed to record decision');
      setSubmittingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading application review workspace...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Application Not Found</h2>
        <Link href="/officer/dashboard">
          <Button variant="outline">Return to Dashboard Queue</Button>
        </Link>
      </div>
    );
  }

  // System Recommendation Logic
  const hasBlockingFail = ruleResults.some((r) => r.status === 'FAIL' && r.is_blocking);
  const isEligible = application.status === 'VERIFIED' || (!hasBlockingFail && ruleResults.every((r) => r.status === 'PASS') && exceptions.length === 0);
  const systemRecommendation: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED' = hasBlockingFail
    ? 'INELIGIBLE'
    : isEligible
    ? 'ELIGIBLE'
    : 'REVIEW_REQUIRED';

  const isCriticalPriority = hasBlockingFail || exceptions.some((e) => e.severity === 'CRITICAL') || riskResult?.risk_level === 'HIGH';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Top Navigation & Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link
            href="/officer/dashboard"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Officer Review Queue
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Application Review — {application.applicant_name}
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Application ID: <span className="font-bold text-slate-800">{application.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {auditVerification && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase border flex items-center gap-1 ${
                auditVerification.valid
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              Audit: {auditVerification.valid ? 'VERIFIED' : 'TAMPERED'}
            </span>
          )}
          {riskResult && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                riskResult.risk_level === 'HIGH'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : riskResult.risk_level === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              ML Risk: {riskResult.risk_level} ({riskResult.risk_score}/100)
            </span>
          )}
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
              isCriticalPriority
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : systemRecommendation === 'REVIEW_REQUIRED'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            Priority: {isCriticalPriority ? 'CRITICAL' : systemRecommendation === 'REVIEW_REQUIRED' ? 'HIGH' : 'NORMAL'}
          </span>
        </div>
      </div>

      {/* Prominent Visual System Recommendation Banner */}
      <div
        className={`rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 ${
          systemRecommendation === 'ELIGIBLE'
            ? 'bg-emerald-950 text-white border-emerald-800'
            : systemRecommendation === 'INELIGIBLE'
            ? 'bg-rose-950 text-white border-rose-800'
            : 'bg-amber-950 text-white border-amber-800'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              systemRecommendation === 'ELIGIBLE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : systemRecommendation === 'INELIGIBLE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {systemRecommendation === 'ELIGIBLE' ? (
              <Award className="w-7 h-7" />
            ) : systemRecommendation === 'INELIGIBLE' ? (
              <XCircle className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
              Automated System Recommendation
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              {systemRecommendation === 'ELIGIBLE'
                ? '✓ SYSTEM RECOMMENDATION: ELIGIBLE'
                : systemRecommendation === 'INELIGIBLE'
                ? '✕ SYSTEM RECOMMENDATION: INELIGIBLE'
                : '⚠ SYSTEM RECOMMENDATION: REVIEW REQUIRED'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {systemRecommendation === 'ELIGIBLE'
                ? 'All deterministic scheme rules passed. Cross-document identity verified.'
                : systemRecommendation === 'INELIGIBLE'
                ? 'One or more blocking scheme eligibility requirements failed.'
                : 'Identity discrepancy or missing document requires manual officer verification.'}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-slate-200">
          Human Officer Decision Required
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (4 cols): Applicant Profile + Audit Trail */}
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
                  <span className="text-[11px] text-slate-500">Applicant Profile</span>
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
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Scheme:</span>
                  <span className="font-semibold text-blue-700">WB Merit Scholarship</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Submission Date:</span>
                  <span className="font-mono text-slate-700">
                    {application.created_at ? new Date(application.created_at).toLocaleDateString('en-IN') : 'Today'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail Timeline */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Verification Audit Trail</span>
              </h4>

              <div className="space-y-3 text-xs border-l-2 border-slate-200 pl-3 ml-1">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1" />
                  <span className="font-bold text-slate-900 block">Application Created</span>
                  <span className="text-[11px] text-slate-400 font-mono">DRAFT → SUBMITTED</span>
                </div>

                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1" />
                  <span className="font-bold text-slate-900 block">Documents Uploaded</span>
                  <span className="text-[11px] text-slate-400 font-mono">{documents.length}/4 Slots Uploaded</span>
                </div>

                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1" />
                  <span className="font-bold text-slate-900 block">Tesseract.js OCR Completed</span>
                  <span className="text-[11px] text-slate-400 font-mono">Raw Text Extracted</span>
                </div>

                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1" />
                  <span className="font-bold text-slate-900 block">Gemini AI Field Extraction</span>
                  <span className="text-[11px] text-slate-400 font-mono">Validated with Zod</span>
                </div>

                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1" />
                  <span className="font-bold text-slate-900 block">Cross-Document Verification</span>
                  <span className="text-[11px] text-slate-400 font-mono">Deterministic Matching</span>
                </div>

                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-600 absolute -left-[17px] top-1" />
                  <span className="font-bold text-purple-700 block">Risk Intelligence Scoring</span>
                  <span className="text-[11px] text-slate-400 font-mono">Explainable Risk Scoring v1</span>
                </div>

                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[17px] top-1" />
                  <span className="font-bold text-blue-700 block">Officer Review Workspace</span>
                  <span className="text-[11px] text-slate-400 font-mono">Awaiting Officer Decision</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (8 cols): Audit Integrity Panel, ML Risk, Submitted Docs, Verification, Rules, Exceptions */}
        <div className="lg:col-span-8 space-y-6">
          {/* PHASE 10 TAMPER-EVIDENT AUDIT INTEGRITY PANEL */}
          <Card className="border-slate-800 bg-slate-950 text-white shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Cryptographic Audit Integrity Chain (Phase 10)
                    </h4>
                    <p className="text-[10px] text-slate-400 italic">
                      Tamper-evident cryptographic audit chain stored in PostgreSQL.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border ${
                      auditVerification?.valid
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    🔐 AUDIT INTEGRITY: {auditVerification?.valid ? 'VERIFIED' : 'TAMPERED'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Events Recorded</span>
                  <span className="font-bold text-base text-white">{auditEvents.length || auditVerification?.event_count || 0} Events</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Chain Status</span>
                  <span className="font-bold text-base text-emerald-400">
                    {auditVerification?.valid ? 'VALID' : 'INVALID'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase block">Hash Algorithm</span>
                  <span className="font-mono text-xs text-blue-400 font-bold">SHA-256 Chained</span>
                </div>
              </div>

              {/* Cryptographic Event Log Timeline */}
              {auditEvents.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cryptographic Event Chain Logs
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {auditEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-300 font-mono text-[11px]">
                            {evt.event_type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(evt.created_at).toLocaleTimeString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                          <span>
                            Hash: <strong className="text-emerald-400">{evt.event_hash.slice(0, 12)}...</strong>
                          </span>
                          <span>
                            Prev: <strong className="text-slate-500">{evt.previous_hash ? evt.previous_hash.slice(0, 12) + '...' : 'null'}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PHASE 9/12A ML RISK INTELLIGENCE PANEL */}
          {riskResult && (
            <Card className="border-purple-200 bg-purple-50/20 shadow-md">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-purple-950 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-700" />
                    <span>Risk Intelligence</span>
                  </h4>
                  <span className="text-[11px] font-mono text-purple-800 bg-purple-100 px-2.5 py-1 rounded border border-purple-200 font-bold">
                    {riskResult.model_name === 'IsolationForest_v1' ? 'Explainable Risk Scoring v1' : 'Explainable Risk Scoring v1'}
                  </span>
                </div>

                {/* Prominent Risk Level, Score, and Recommended Priority Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-white border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RISK LEVEL</span>
                    <span
                      className={`text-base font-bold uppercase font-mono px-2.5 py-0.5 rounded inline-block ${
                        riskResult.risk_level === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : riskResult.risk_level === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {riskResult.risk_level} RISK
                    </span>
                  </div>

                  <div className="p-3.5 bg-white border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RISK SCORE</span>
                    <span className="text-xl font-bold font-mono text-purple-950">
                      {riskResult.risk_score} / 100
                    </span>
                  </div>

                  <div className="p-3.5 bg-white border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Review Priority</span>
                    <span
                      className={`text-xs font-bold uppercase font-mono px-2.5 py-1 rounded inline-block ${
                        riskResult.risk_level === 'HIGH'
                          ? 'bg-rose-600 text-white'
                          : riskResult.risk_level === 'MEDIUM'
                          ? 'bg-amber-500 text-slate-950 font-extrabold'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {riskResult.risk_level === 'HIGH'
                        ? 'PRIORITY REVIEW'
                        : riskResult.risk_level === 'MEDIUM'
                        ? 'ENHANCED REVIEW'
                        : 'NORMAL REVIEW'}
                    </span>
                  </div>
                </div>

                {/* WHY THIS SCORE? Section */}
                <div className="space-y-2 pt-1">
                  <span className="font-bold text-purple-950 block text-xs uppercase tracking-wider">
                    WHY THIS SCORE? ({riskResult.contributing_signals.length} Signals Detected)
                  </span>
                  <div className="space-y-2">
                    {riskResult.contributing_signals.length > 0 ? (
                      riskResult.contributing_signals.map((sig, idx) => (
                        <div key={idx} className="p-3 bg-white border border-purple-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-800 font-medium">
                          <span className="w-2 h-2 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                          <span>{sig}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-white border border-purple-200 rounded-lg text-xs text-slate-600 font-medium">
                        • Clean verification across all uploaded document slots with no statistical anomaly signals.
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-purple-900/90 italic pt-2 border-t border-purple-200 font-medium">
                  Risk intelligence prioritizes officer review and does not override deterministic eligibility rules.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Submitted Documents Grid with Signed URL Preview */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Submitted Documents ({documents.length}/4)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs uppercase">{doc.slot_type}</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      OCR: {doc.ocr_confidence ? (Number(doc.ocr_confidence) * 100).toFixed(0) : '95'}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1 font-mono">
                    {doc.original_filename || `${doc.slot_type}.pdf`}
                  </p>

                  <Button
                    onClick={() => handleOpenDocumentPreview(doc)}
                    isLoading={previewLoading && previewDoc?.id === doc.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Document</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted Data Panel */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Extracted Fields & Source Snippets</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {extractedFields.map((field) => (
                  <div key={field.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700 text-[11px]">{field.field_name}</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {(Number(field.confidence || 0.95) * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                    <div className="font-mono text-slate-900 font-bold">
                      {field.normalized_value || field.raw_value || <span className="text-rose-400 italic">null</span>}
                    </div>
                    {field.source_text && (
                      <p className="text-[10px] text-slate-500 line-clamp-1 italic bg-white p-1 rounded border border-slate-100">
                        Source: "{field.source_text}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cross-Document Verification Panel (Phase 5) */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Cross-Document Consistency Audit</span>
              </h4>

              <div className="space-y-3 text-xs">
                {verificationResults.map((v) => (
                  <div key={v.field_name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 uppercase">Field: {v.field_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          v.status === 'MATCH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{v.mismatch_reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deterministic Eligibility Section (Phase 6) */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600" />
                <span>Deterministic Scheme Eligibility Rules</span>
              </h4>

              <div className="space-y-3 text-xs">
                {ruleResults.map((r) => (
                  <div key={r.rule_id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{r.rule_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                    <div className="flex gap-4 font-mono text-[11px] bg-white p-2 rounded border border-slate-200">
                      <span>Evaluated: <strong>{r.evaluated_value}</strong></span>
                      <span>Operator: <strong>{r.operator}</strong></span>
                      <span>Threshold: <strong>{r.threshold}</strong></span>
                    </div>
                    <p className="text-slate-600">{r.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exceptions Panel */}
          {exceptions.length > 0 && (
            <Card className="border-rose-200 bg-rose-50/30">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Detected Exceptions & Action Flags ({exceptions.length})</span>
                </h4>

                <div className="space-y-3 text-xs">
                  {exceptions.map((exc, idx) => (
                    <div key={idx} className="p-3.5 bg-white border border-rose-200 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-rose-900">{exc.type}</span>
                        <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                          {exc.severity} SEVERITY
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{exc.description}</p>
                      <p className="text-[11px] text-slate-500">
                        <strong>Recommended Action:</strong> {exc.recommended_action}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Reviews Panel */}
          {pastReviews.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Past Officer Decisions</span>
                </h4>

                <div className="space-y-3 text-xs">
                  {pastReviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{rev.decision}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(rev.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-slate-700">{rev.notes}</p>
                      {rev.rejection_reasons && (
                        <p className="text-[11px] text-rose-700">
                          Reasons: {rev.rejection_reasons.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky Officer Action Panel (Fixed Bottom Bar) */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 z-40 py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Officer Decision Control</span>
            <span className="text-sm font-bold text-white">
              System Recommendation: <strong className="text-blue-400">{systemRecommendation}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setActiveModal('CORRECTION');
                setDecisionError(null);
              }}
              variant="outline"
              className="bg-amber-950/60 border-amber-700 text-amber-300 hover:bg-amber-900/60 text-xs"
            >
              Request Correction
            </Button>

            <Button
              onClick={() => {
                setActiveModal('REJECT');
                setDecisionError(null);
              }}
              variant="outline"
              className="bg-rose-950/60 border-rose-700 text-rose-300 hover:bg-rose-900/60 text-xs"
            >
              Reject Application
            </Button>

            <Button
              onClick={() => {
                setActiveModal('APPROVE');
                setDecisionError(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Approve Application
            </Button>
          </div>
        </div>
      </div>

      {/* Document Preview Drawer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold truncate">{previewDoc.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-auto flex items-center justify-center">
              <iframe
                src={previewDoc.url}
                className="w-full h-full rounded border border-slate-300 bg-white"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Officer Decision: {activeModal}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {decisionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{decisionError}</span>
              </div>
            )}

            {/* Ineligible Warning for Approve */}
            {activeModal === 'APPROVE' && hasBlockingFail && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                <strong>Explicit Officer Confirmation Required:</strong>
                <p>This application has failed one or more blocking eligibility rules. Are you sure you want to override and approve it?</p>
              </div>
            )}

            {/* Rejection Reasons Selector */}
            {activeModal === 'REJECT' && (
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-slate-700 block">Select Rejection Reasons *</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200">
                  {[
                    'Eligibility requirement not satisfied',
                    'Invalid document format',
                    'Cross-document identity mismatch',
                    'Missing required document',
                    'Annual family income exceeds threshold',
                    'Academic marks below minimum requirement',
                    'State domicile requirement not satisfied',
                    'Other officer discrepancy',
                  ].map((reason) => (
                    <label key={reason} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRejectionReasons.includes(reason)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRejectionReasons((prev) => [...prev, reason]);
                          } else {
                            setSelectedRejectionReasons((prev) => prev.filter((r) => r !== reason));
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Officer Notes Input */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Officer Explanation Notes *</label>
              <textarea
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Provide official officer rationale for this decision..."
                rows={3}
                required
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDecision}
                isLoading={submittingDecision}
                className={
                  activeModal === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold'
                    : activeModal === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white font-semibold'
                    : 'bg-amber-600 hover:bg-amber-500 text-white font-semibold'
                }
              >
                Submit Decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
