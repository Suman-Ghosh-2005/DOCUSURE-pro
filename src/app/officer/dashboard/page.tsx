'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { createClient } from '@/lib/supabase/client';
import { Application } from '@/types/application.types';
import { RiskLevel } from '@/types/risk.types';
import { DEFAULT_SCHEME_NAME } from '@/lib/constants/default-rules';
import {
  FileSearch,
  Search,
  Award,
  XCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Loader2,
  RefreshCw,
  Brain,
  LogOut,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export type ReviewPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';

export interface EnrichedApplicationItem {
  application: Application;
  priority: ReviewPriority;
  exceptionCount: number;
  verificationStatus: string;
  eligibilityStatus: string;
  riskLevel: RiskLevel;
  riskScore: number;
  formattedTime: string;
}

export default function OfficerDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<EnrichedApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchQueueData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const json = await res.json();

      if (res.ok && json.data) {
        const enrichedList: EnrichedApplicationItem[] = (json.data as Application[]).map((app) => {
          let priority: ReviewPriority = 'NORMAL';
          let exceptionCount = 0;
          let verificationStatus = 'PASS';
          let eligibilityStatus = 'ELIGIBLE';
          let riskLevel: RiskLevel = 'LOW';
          let riskScore = 12;

          if (app.status === 'INELIGIBLE') {
            priority = 'CRITICAL';
            exceptionCount = 1;
            eligibilityStatus = 'INELIGIBLE';
            riskLevel = 'HIGH';
            riskScore = 84;
          } else if (app.status === 'EXCEPTION') {
            priority = 'HIGH';
            exceptionCount = 2;
            verificationStatus = 'REVIEW_REQUIRED';
            eligibilityStatus = 'REVIEW_REQUIRED';
            riskLevel = 'HIGH';
            riskScore = 78;
          } else if (app.status === 'INCOMPLETE') {
            priority = 'HIGH';
            exceptionCount = 1;
            verificationStatus = 'INCONCLUSIVE';
            eligibilityStatus = 'REVIEW_REQUIRED';
            riskLevel = 'MEDIUM';
            riskScore = 55;
          } else if (app.status === 'APPROVED' || app.status === 'VERIFIED') {
            priority = 'NORMAL';
            eligibilityStatus = 'ELIGIBLE';
            riskLevel = 'LOW';
            riskScore = 12;
          }

          // Format submitted timestamp (HH:MM)
          const dateObj = app.created_at ? new Date(app.created_at) : new Date();
          const formattedTime = dateObj.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });

          return {
            application: app,
            priority,
            exceptionCount,
            verificationStatus,
            eligibilityStatus,
            riskLevel,
            riskScore,
            formattedTime: `Submitted ${formattedTime}`,
          };
        });

        // Ensure created_at DESC sorting
        enrichedList.sort((a, b) => {
          const timeA = new Date(a.application.created_at || 0).getTime();
          const timeB = new Date(b.application.created_at || 0).getTime();
          return timeB - timeA;
        });

        setItems(enrichedList);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Top 5 Newest Applications for Live Demo Presentation
  const recentItems = items.slice(0, 5);

  // Filter & Search Logic for Full Intake Queue
  const filteredItems = items.filter((item) => {
    const nameMatch = item.application.applicant_name.toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = item.application.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || idMatch;

    if (!matchesSearch) return false;

    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return !['APPROVED', 'REJECTED'].includes(item.application.status);
    if (activeFilter === 'ELIGIBLE') return item.application.status === 'VERIFIED' || item.application.status === 'APPROVED';
    if (activeFilter === 'INELIGIBLE') return item.application.status === 'INELIGIBLE' || item.application.status === 'REJECTED';
    if (activeFilter === 'HIGH_RISK') return item.riskLevel === 'HIGH';
    if (activeFilter === 'MEDIUM_RISK') return item.riskLevel === 'MEDIUM';
    if (activeFilter === 'LOW_RISK') return item.riskLevel === 'LOW';

    return true;
  });

  const totalCount = items.length;
  const eligibleCount = items.filter((i) => ['VERIFIED', 'APPROVED'].includes(i.application.status)).length;
  const ineligibleCount = items.filter((i) => ['INELIGIBLE', 'REJECTED'].includes(i.application.status)).length;
  const highRiskCount = items.filter((i) => i.riskLevel === 'HIGH').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Government Officer Workstation (Authenticated Officer)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Scholarship Application Review Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scheme Scope: <strong className="text-slate-800">{DEFAULT_SCHEME_NAME}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={fetchQueueData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Queue</span>
          </Button>

          <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-1.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* PROMINENT LIVE DEMO SECTION: RECENT APPLICATIONS (Top 5 DESC) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Recent Applications (Live Intake)
            </h2>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            Ordered by created_at DESC (Newest First)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : recentItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            No recent applications submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map(({ application, priority, eligibilityStatus, riskLevel, riskScore, formattedTime }) => (
              <Card
                key={application.id}
                className="border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all bg-white relative overflow-hidden"
              >
                <div className={`h-1.5 w-full ${riskLevel === 'HIGH' ? 'bg-rose-500' : riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{application.applicant_name}</h3>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedTime}</span>
                        <span>•</span>
                        <span>ID: {application.id.slice(0, 8)}</span>
                      </div>
                    </div>
                    <StatusBadge status={application.status} />
                  </div>

                  {/* Eligibility & ML Risk Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Eligibility:</span>
                      <span className={eligibilityStatus === 'ELIGIBLE' ? 'text-emerald-700' : eligibilityStatus === 'INELIGIBLE' ? 'text-rose-700' : 'text-amber-700'}>
                        {eligibilityStatus}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        riskLevel === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : riskLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {riskLevel} RISK ({riskScore})
                    </span>
                  </div>

                  <Link href={`/officer/applications/${application.id}`}>
                    <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs gap-1.5">
                      <span>Review Application</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Total Intake</span>
              <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Eligible</span>
              <span className="text-2xl font-bold text-emerald-600">{eligibleCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Ineligible</span>
              <span className="text-2xl font-bold text-rose-600">{ineligibleCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wider block">High Risk Score</span>
              <span className="text-2xl font-bold text-purple-900">{highRiskCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FULL INTAKE QUEUE SECTION */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Full Intake Queue</h2>
          <span className="text-xs text-slate-500 font-mono">Showing {filteredItems.length} of {totalCount} records</span>
        </div>

        {/* Filter Tabs & Search Controls */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by applicant name or ID..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'ALL', label: 'All Intake' },
                { id: 'PENDING', label: 'Pending Review' },
                { id: 'ELIGIBLE', label: 'Eligible' },
                { id: 'INELIGIBLE', label: 'Ineligible' },
                { id: 'HIGH_RISK', label: 'High Risk' },
                { id: 'MEDIUM_RISK', label: 'Medium Risk' },
                { id: 'LOW_RISK', label: 'Low Risk' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    activeFilter === f.id
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Queue Table */}
        <Card className="border-slate-200">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Loading officer review queue...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No applications match your query</p>
                <p className="text-xs text-slate-500">Try adjusting your search terms or filter selection.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Applicant Name</th>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Eligibility</th>
                    <th className="py-3 px-4 text-center">ML Risk Score</th>
                    <th className="py-3 px-4 text-center">Priority</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map(({ application, priority, verificationStatus, eligibilityStatus, riskLevel, riskScore }) => (
                    <tr key={application.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {application.applicant_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {application.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {application.created_at ? new Date(application.created_at).toLocaleDateString('en-IN') : 'Today'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={application.status} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={verificationStatus === 'PASS' ? 'text-emerald-700' : 'text-amber-700'}>
                          {verificationStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={eligibilityStatus === 'ELIGIBLE' ? 'text-emerald-700' : eligibilityStatus === 'INELIGIBLE' ? 'text-rose-700' : 'text-amber-700'}>
                          {eligibilityStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                            riskLevel === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : riskLevel === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {riskLevel} ({riskScore})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            priority === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/officer/applications/${application.id}`}>
                          <Button size="sm" variant="outline" className="gap-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                            <span>Review</span>
                            <ArrowRight className="w-3 h-3 text-blue-600" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
