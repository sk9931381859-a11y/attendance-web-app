'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { requestPasswordResetAction } from './actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await requestPasswordResetAction(email);
      if (!res.success) {
        setError(res.error || 'Failed to send recovery instructions.');
        return;
      }

      setSuccessMessage(
        res.message ||
          'Check your inbox! If an account exists, a secure password reset link has been dispatched.'
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans">
      {/* 1. TOP HEADER */}
      <header className="border-b bg-white px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                SECURITY
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Icon & Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center mx-auto text-teal-600 mb-4 shadow-sm">
              <KeyRound size={26} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Reset Password
            </h1>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
              Enter your work email address and we will dispatch a password recovery link to restore your account access.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-3 shadow-xs">
                <CheckCircle2 size={18} className="text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{successMessage}</div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-2 leading-relaxed">
                <p className="font-semibold text-gray-800">Next Steps:</p>
                <p>
                  1. Check your email inbox (and spam/junk folder).<br />
                  2. Click the secure reset link provided in the message.<br />
                  3. You will be routed to the password update screen to define your new password.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
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
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@school.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !email}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isPending ? (
                  <>
                    <RotateCw size={15} className="animate-spin" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="text-center pt-3">
                <Link
                  href="/login"
                  className="text-xs text-gray-500 hover:text-gray-800 transition font-medium"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t bg-white">
        <p>Attendance Hub &bull; ZenithFlow Cloud Security</p>
      </footer>
    </div>
  );
}
