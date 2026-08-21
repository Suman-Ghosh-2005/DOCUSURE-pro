'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Loader2, LogOut, User, FileSearch } from 'lucide-react';

function OfficerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Session Check
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch server-side resolved profile role
          const res = await fetch('/api/auth/profile');
          const json = await res.json();
          const role = json.data?.role || 'APPLICANT';

          if (role === 'OFFICER') {
            router.push('/officer/dashboard');
            return;
          }

          setCurrentUser({
            name: json.data?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Applicant User',
            email: user.email || '',
            role,
          });
        }
      } catch (err) {
        console.warn('[Officer Login] Session check notice:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkActiveSession();
  }, [router]);

  const handleSignOutAndContinue = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both officer email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (data.user) {
        // Fetch server-side profile resolution (bypasses RLS recursion using admin client)
        const res = await fetch('/api/auth/profile');
        const json = await res.json();
        const role = json.data?.role || data.user.user_metadata?.role?.toUpperCase();

        console.log('[AUTH DEBUG] login email =', email);
        console.log('[AUTH DEBUG] authenticated user id =', data.user.id);
        console.log('[AUTH DEBUG] authenticated user email =', data.user.email);
        console.log('[AUTH DEBUG] profile id =', data.user.id);
        console.log('[AUTH DEBUG] profile role =', role);
        console.log('[AUTH DEBUG] officer authorization result =', role === 'OFFICER');

        if (role !== 'OFFICER') {
          // Immediately sign out if non-officer attempts officer login
          await supabase.auth.signOut();
          throw new Error('Access Denied: This account does not have Officer workstation permissions.');
        }

        router.push('/officer/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid officer credentials';
      setError(msg);
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
      </div>
    );
  }

  // Session Switch Confirmation Card if signed in as APPLICANT
  if (currentUser && currentUser.role === 'APPLICANT') {
    return (
      <Card className="border-amber-200 bg-amber-50/40 shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Switch to Officer Portal</h2>
            <p className="text-xs text-slate-600">
              You are currently signed in as an Applicant:
            </p>
            <div className="p-3 bg-white border border-amber-200 rounded-lg text-xs font-mono mt-2 space-y-0.5">
              <div className="font-bold text-slate-900">{currentUser.name}</div>
              <div className="text-slate-500">{currentUser.email}</div>
              <div className="text-amber-700 font-bold uppercase text-[10px]">Role: APPLICANT</div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            To review applications as a Government Officer, please sign out of your Applicant account first.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/applicant/dashboard" className="w-full">
              <Button type="button" variant="outline" className="w-full text-xs">
                Cancel & Return to Dashboard
              </Button>
            </Link>

            <Button
              onClick={handleSignOutAndContinue}
              isLoading={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Continue to Officer Login</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-950 text-white shadow-2xl">
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <FileSearch className="w-3.5 h-3.5 text-blue-400" />
            <span>Authorized Personnel Only</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white pt-2">
            Officer Workstation Sign In
          </h2>
          <p className="text-xs text-slate-400">
            Enter authorized government review officer credentials
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleOfficerLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Officer Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@docusure.demo"
                required
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-900 text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-900 text-white"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 gap-2"
          >
            <span>Authenticate Officer Session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Not an officer?{' '}
          <Link href="/login?role=applicant" className="font-bold text-blue-400 hover:underline">
            Applicant Portal Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DedicatedOfficerLoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <Suspense
          fallback={
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            </div>
          }
        >
          <OfficerLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
