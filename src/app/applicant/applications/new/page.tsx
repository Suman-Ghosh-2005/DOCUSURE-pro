'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_SCHEME_NAME, DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { User, Calendar, Award, ArrowLeft, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function NewApplicationPage() {
  const router = useRouter();
  const [applicantName, setApplicantName] = useState('');
  const [dob, setDob] = useState('2004-03-14');
  const [gender, setGender] = useState('Female');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill applicant name from logged in profile
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();

        if (prof?.name) {
          setApplicantName(prof.name);
        } else if (user.user_metadata?.name) {
          setApplicantName(user.user_metadata.name);
        }
      }
    };
    loadProfile();
  }, []);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) {
      setError('Please enter the applicant full name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_name: applicantName.trim(),
          dob: dob || '2004-03-14',
          gender: gender || 'Female',
          scheme_id: DEFAULT_SCHEME_ID,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to create application');
      }

      const applicationId = json.data.id;
      router.push(`/applicant/applications/${applicationId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Application creation error';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <Link
        href="/applicant/dashboard"
        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Applicant Dashboard
      </Link>

      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>DOCUSURE PRO Application Intake (Step 1 of 3)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create Scholarship Application
        </h1>
        <p className="text-xs text-slate-500">
          Enter applicant details and select the target scheme
        </p>
      </div>

      <Card className="border-slate-200 shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateApplication} className="space-y-5">
            {/* Scheme Scope Banner */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600" />
                Target Scheme: {DEFAULT_SCHEME_NAME}
              </span>
              <p className="text-blue-800 text-[11px]">
                Requires 4 standard documents: ID Proof, Income Certificate, Academic Marksheet, and Domicile Certificate.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Applicant Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Swati Ghosh"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Date of Birth *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Link href="/applicant/dashboard">
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                isLoading={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-2"
              >
                <span>Continue to Document Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
