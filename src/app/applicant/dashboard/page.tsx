'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { createClient } from '@/lib/supabase/client';
import { Application } from '@/types/application.types';
import { UserProfile } from '@/types/auth.types';
import { DEFAULT_SCHEME_NAME } from '@/lib/constants/default-rules';
import {
  User,
  PlusCircle,
  FileText,
  LogOut,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function ApplicantDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplicantData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/applicant/dashboard');
        return;
      }

      // Fetch Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (prof?.role === 'OFFICER') {
        router.push('/officer/dashboard');
        return;
      }

      if (prof) {
        setProfile(prof as UserProfile);
      } else {
        setProfile({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Applicant',
          email: user.email || '',
          role: 'APPLICANT',
          created_at: user.created_at,
        });
      }

      // Fetch strictly owned applications from server API
      const res = await fetch('/api/applications');
      const json = await res.json();

      if (res.ok && json.data) {
        setApplications(json.data as Application[]);
      }
    } catch (err) {
      console.error('Error loading applicant dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantData();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-600 font-medium">Loading applicant portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 mb-2">
            <User className="w-3.5 h-3.5" />
            <span>Applicant Citizen Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome, {profile?.name || 'Applicant'}
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Registered Email: <strong className="text-slate-800">{profile?.email}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/applicant/applications/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5 text-xs">
              <PlusCircle className="w-4 h-4" />
              <span>Create New Application</span>
            </Button>
          </Link>

          <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-1.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Applications Table Card */}
      <Card className="border-slate-200 shadow-md">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">My Submitted Applications ({applications.length})</h2>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Active Applications Found</h3>
                <p className="text-xs text-slate-500 mt-1">Start by creating a new scholarship application.</p>
              </div>
              <Link href="/applicant/applications/new">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5 text-xs">
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Application Now</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 hover:border-blue-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Scheme Scope</span>
                      <h3 className="text-sm font-bold text-slate-900">{DEFAULT_SCHEME_NAME}</h3>
                      <p className="text-xs font-mono text-slate-500">
                        Application ID: <span className="font-bold text-slate-800">{app.id}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={app.status} />
                      <span className="text-xs text-slate-500 font-mono">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN') : 'Today'}
                      </span>
                    </div>
                  </div>

                  {/* Decision / Status Detail Banner */}
                  {app.routing_reason && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium border ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-900 border-rose-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      <strong>Officer Decision / Status Note:</strong> {app.routing_reason}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                      <span>Applicant: <strong>{app.applicant_name}</strong></span>
                      <span>DOB: <strong>{app.dob || '14/03/2004'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/applicant/applications/${app.id}`}>
                        <Button size="sm" variant="outline" className="gap-1 text-xs border-slate-300 text-slate-700 hover:bg-slate-100">
                          <span>Document Workspace</span>
                        </Button>
                      </Link>

                      <Link href={`/applicant/applications/${app.id}/processing`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1">
                          <span>View Pipeline Status</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
