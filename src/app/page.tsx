'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import {
  Upload,
  FileScan,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  FileSearch,
  Loader2,
  User,
  LogIn,
  UserPlus,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [loadingScenarioId, setLoadingScenarioId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);

  const pipelineSteps = [
    {
      step: '01',
      title: 'Upload',
      icon: Upload,
      description: 'Applicant submits 4 required government documents (ID, Income, Marksheet, Domicile).',
    },
    {
      step: '02',
      title: 'Extract',
      icon: FileScan,
      description: 'OCR & AI extract structured fields (Name, DOB, Income, Marks) with Zod verification.',
    },
    {
      step: '03',
      title: 'Verify',
      icon: ShieldCheck,
      description: 'Deterministic engine compares fields across documents & checks eligibility rules.',
    },
    {
      step: '04',
      title: 'Decide',
      icon: UserCheck,
      description: 'Clean applications auto-approve. Only genuine exceptions route to officer review.',
    },
  ];

  const handleSelectScenario = async (scenarioId: DemoScenarioId) => {
    setLoadingScenarioId(scenarioId);
    setLoadingStep('Generating synthetic document PDFs (jsPDF)...');

    try {
      const timer = setTimeout(() => {
        setLoadingStep('Uploading to Supabase Storage & creating database records...');
      }, 500);

      const res = await fetch('/api/demo/load-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });

      clearTimeout(timer);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to load scenario');
      }

      const redirectUrl = json.data.redirect_url;
      setLoadingStep('Redirecting to Document Workspace...');

      setLoadingScenarioId(null);
      setLoadingStep(null);

      if (typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      } else {
        router.push(redirectUrl);
      }
    } catch (err: unknown) {
      console.error('[DEMO] Failed to load demo scenario:', err);
      alert('Error generating scenario documents. Please try again.');
      setLoadingScenarioId(null);
      setLoadingStep(null);
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Loading Modal for Demo Scenario Generator */}
      {loadingScenarioId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Loading Hackathon Demo Scenario</h3>
              <p className="text-xs text-blue-600 font-medium mt-1 animate-pulse">{loadingStep}</p>
            </div>
            <p className="text-[11px] text-slate-400">
              Generating machine-readable synthetic PDFs & uploading to private Supabase Storage bucket...
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>SIH 2026 Verification Portal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Smart Document Verification for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
              Government Schemes
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Government scheme intake requires manual inspection of thousands of multi-source documents.
            <strong className="text-white font-semibold"> DOCUSURE PRO </strong>
            automates extraction, cross-document matching, scheme eligibility, ML risk scoring, and tamper-evident audit sealing.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login?role=applicant">
              <Button size="lg" className="gap-2 text-sm px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                <User className="w-4 h-4" />
                <span>Applicant Portal</span>
              </Button>
            </Link>

            <Link href="/officer/login">
              <Button size="lg" variant="outline" className="gap-2 text-sm px-6 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 font-semibold">
                <FileSearch className="w-4 h-4 text-blue-400" />
                <span>Officer Workstation</span>
              </Button>
            </Link>

            <Link href="/signup">
              <Button size="lg" variant="outline" className="gap-2 text-sm px-5 border-emerald-400/40 text-emerald-300 hover:bg-emerald-950/60">
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Button>
            </Link>

            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2 text-sm px-5 border-blue-400/40 text-blue-300 hover:bg-blue-950/60">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Pipeline Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            The Intelligent Verification Pipeline
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            Combining OCR, validated AI field extraction, and deterministic verification rules.
          </p>
        </div>

        {/* 4-Step Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {pipelineSteps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Card key={s.step} className="relative border-slate-200 hover:border-blue-300 transition-all hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      STEP {s.step}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.description}</p>
                  </div>

                  {idx < pipelineSteps.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-300">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Core Principle Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-400/30">
              <Layers className="w-3.5 h-3.5" />
              <span>Core Architectural Principle</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Deterministic Rules Over AI Authority
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              AI assists with document classification, OCR extraction, normalization, and generating explanations.
              <strong className="text-white"> Final eligibility rules and cross-document comparisons are 100% deterministic code.</strong> AI never independently approves or rejects applications.
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-3 min-w-[220px]">
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Cross-Document Levenshtein</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>JSON Eligibility Rules</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Full Audit Logging</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-built Demo Scenarios (Interactive One-Click Generators) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pre-built Hackathon Demo Scenarios
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Click any scenario card below to generate synthetic PDFs, populate DB records, and launch the test case.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            Scheme: WB State Merit Scholarship 2026
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Object.keys(DEMO_SCENARIOS) as DemoScenarioId[]).map((key) => {
            const scenario = DEMO_SCENARIOS[key];
            const isLoading = loadingScenarioId === key;

            return (
              <Card key={scenario.id} className="flex flex-col border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{scenario.name}</h3>
                      <StatusBadge status={scenario.expectedStatus} />
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                      Applicant: <span className="text-slate-800 font-bold">{scenario.applicantName}</span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {scenario.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => handleSelectScenario(scenario.id)}
                      isLoading={isLoading}
                      variant="outline"
                      size="sm"
                      className="w-full justify-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      <span>Load Scenario Documents</span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
