'use client';

import React, { useState, useRef, useEffect, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Lock,
} from 'lucide-react';
import { verifyOtpAction, resendOtpAction } from './actions';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Focus the first digit input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    setError(null);
    const cleanVal = val.replace(/\D/g, '');

    // Handle multi-character paste into any box
    if (cleanVal.length > 1) {
      const pasteDigits = cleanVal.slice(0, 6).split('');
      const newDigits = [...digits];
      pasteDigits.forEach((d, i) => {
        if (index + i < 6) {
          newDigits[index + i] = d;
        }
      });
      setDigits(newDigits);
      const nextFocus = Math.min(index + pasteDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance to next box if digit was typed
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResendStatus(null);

    const token = digits.join('');
    if (token.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please return to the registration form.');
      return;
    }

    startTransition(async () => {
      const res = await verifyOtpAction(email, token);
      if (!res.success) {
        setError(res.error || 'Verification failed. Please check the code and try again.');
        return;
      }

      router.push(res.redirectTo || '/dashboard');
      router.refresh();
    });
  };

  const handleResend = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    setError(null);
    setResendStatus(null);

    try {
      const res = await resendOtpAction(email);
      if (res.success) {
        setResendStatus(res.message);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
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
                OTP VERIFICATION
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
        >
          Sign In &rarr;
        </Link>
      </header>

      {/* 2. MAIN OTP CONTAINER */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Icon & Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center mx-auto text-teal-600 mb-4 shadow-sm">
              <Mail size={26} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Verify Your Email
            </h1>
            <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
              We have sent a 6-digit confirmation code to{' '}
              <span className="font-semibold text-gray-800 break-all">{email || 'your email'}</span>.
              Enter the code below to activate your account.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Resend Success Alert */}
          {resendStatus && (
            <div className="mb-5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-start gap-2.5 shadow-xs">
              <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{resendStatus}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!initialEmail && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
              </div>
            )}

            {/* 6-Digit OTP Box Grid */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 text-center">
                6-Digit Confirmation Code
              </label>
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 focus:bg-white transition shadow-2xs"
                    disabled={isPending}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || digits.join('').length !== 6}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
            >
              {isPending ? (
                <>
                  <RotateCw size={15} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify &amp; Enter Dashboard</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Resend Code Footer */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || !email}
                className="font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-50 transition"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>

            <Link
              href="/register"
              className="text-gray-400 hover:text-gray-600 text-[11px] transition"
            >
              Need to change your registration email?
            </Link>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t bg-white">
        <p>Attendance Hub &bull; ZenithFlow Cloud Security</p>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
