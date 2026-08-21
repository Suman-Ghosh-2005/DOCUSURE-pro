'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DEFAULT_SCHEME_ID, DEFAULT_SCHEME_NAME } from '@/lib/constants/default-rules';
import { ArrowLeft, ArrowRight, User, Calendar, Users, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ApplyPage() {
  const router = useRouter();
  const [applicantName, setApplicantName] = useState('');
  const [dob, setDob] = useState('2004-03-14');
  const [gender, setGender] = useState('Female');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) {
      setErrorMessage('Applicant full name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_name: applicantName.trim(),
          dob,
          gender,
          scheme_id: DEFAULT_SCHEME_ID,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to create application');
      }

      router.push(`/apply/${json.data.id}/upload`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting application';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Start New Scholarship Application
          </h1>
          <StatusBadge status="DRAFT" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Scheme: <strong className="text-slate-800">{DEFAULT_SCHEME_NAME}</strong>
        </p>
      </div>

      <Card>
        <CardContent className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Applicant Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Full Name (as on Identity Document) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. ANANYA GHOSH"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500">
                  Must match your identity proof exactly for automated cross-document verification.
                </p>
              </div>

              {/* Date of Birth & Gender Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Target Scheme Card (Read-only) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Scheme Eligibility Scope: WB Merit Scholarship</span>
                </div>
                <p className="text-slate-600">
                  Required documents: Identity Proof, Income Certificate, Academic Marksheet, Domicile Certificate.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Link href="/">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>

              <Button type="submit" isLoading={isSubmitting} className="gap-2">
                <span>Continue to Document Upload</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
