'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Loader2, User, FileSearch } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const errorParam = searchParams.get('error');
  const roleHint = searchParams.get('role');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'OFFICER_REQUIRED' ? 'Officer credentials required to access Officer Portal.' : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
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
        // Fetch real profile from DB to determine true role (never trust URL params)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const actualRole = profile?.role || data.user.user_metadata?.role || 'APPLICANT';

        if (redirectPath) {
          router.push(redirectPath);
        } else if (actualRole === 'OFFICER') {
          router.push('/officer/dashboard');
        } else {
          router.push('/applicant/dashboard');
        }
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          {roleHint === 'officer' ? (
            <FileSearch className="w-3.5 h-3.5" />
          ) : (
            <User className="w-3.5 h-3.5" />
          )}
          <span>
            {roleHint === 'officer' ? 'Government Officer Portal' : 'Applicant Citizen Portal'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {roleHint === 'officer' ? 'Officer Workstation Sign In' : 'Applicant Citizen Sign In'}
        </h1>
        <p className="text-xs text-slate-500">
          {roleHint === 'officer'
            ? 'Sign in with your government officer credentials'
            : 'Sign in to access your scholarship applications'}
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 gap-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link href="/signup" className="font-bold text-blue-600 hover:underline">
              Create Applicant Account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
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
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
