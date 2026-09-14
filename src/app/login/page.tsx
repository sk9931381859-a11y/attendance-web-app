'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  GraduationCap,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { loginWithRateLimit } from '@/app/login/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'unauthorized'
      ? 'Access restricted: Please sign in with an authorized account.'
      : null
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleFillDemoStaff = () => {
    setEmail('teacher@attendance.app');
    setPassword('StaffPassword123!');
    setError(null);
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@attendance.app');
    setPassword('AdminPassword123!');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await loginWithRateLimit(formData);
        if (res?.error) {
          setError(res.error);
        }
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
          throw err;
        }
        setError(err instanceof Error ? err.message : 'An unexpected error occurred during sign in.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={20} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                AUTH PORTAL
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              Unified Staff & Administrator Access
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
        >
          &larr; Back to App
        </Link>
      </header>

      {/* 2. MAIN LOGIN CONTAINER */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-3 shadow-sm">
              <Lock size={22} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Sign In to Your Account
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Enter your credentials to access the staff check-in scanner or principal administration dashboard.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-red-800">
                  {error.toLowerCase().includes('too many') || error.toLowerCase().includes('rate')
                    ? 'Rate Limit Exceeded'
                    : 'Authentication Failed'}
                </div>
                <div className="text-red-700 text-[11px] mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={15} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. teacher@attendance.app"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={15} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Demo Credentials
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleFillDemoStaff}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-[11px] text-gray-700 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-teal-600" />
                  <div>
                    <span className="font-semibold text-gray-900 group-hover:text-black">
                      Staff Portal (/scan)
                    </span>
                    <span className="block text-[10px] text-gray-500 font-mono">
                      teacher@attendance.app
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Staff Role
                </span>
              </button>

              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-[11px] text-gray-700 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-green-600" />
                  <div>
                    <span className="font-semibold text-gray-900 group-hover:text-black">
                      Admin Dashboard (/dashboard)
                    </span>
                    <span className="block text-[10px] text-gray-500 font-mono">
                      admin@attendance.app
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                  Admin Role
                </span>
              </button>
            </div>

            {/* Self-Serve Register Workspace Link */}
            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Need to register a new school or organization?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-teal-700 hover:text-teal-900 hover:underline transition"
                >
                  Create workspace &rarr;
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="text-center text-[11px] text-gray-500 max-w-md mx-auto w-full py-4">
        Attendance Web App &bull; Cryptographic Device Lock &amp; RBAC
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 text-gray-500 flex items-center justify-center text-xs">
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
