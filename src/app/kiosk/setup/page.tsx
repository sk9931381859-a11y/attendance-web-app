'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Lock,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { verifyKioskPinAction } from '../actions';

export default function KioskSetupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [schoolCode, setSchoolCode] = useState('');
  const [kioskPin, setKioskPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pairedSchool, setPairedSchool] = useState<string | null>(null);

  const handleFillDemo = () => {
    setSchoolCode('100001');
    setKioskPin('1234');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolCode.trim() || !kioskPin.trim()) {
      setError('Please provide both the 6-digit School Code and 4-digit Kiosk PIN.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await verifyKioskPinAction(schoolCode, kioskPin);
        if (!res.success || !res.school_id) {
          setError(res.error || 'Invalid credentials. Check the code and PIN provided by your school principal.');
          return;
        }

        // Save school_id and metadata to browser localStorage (Headless device pairing)
        localStorage.setItem('attendance_kiosk_school_id', res.school_id);
        localStorage.setItem('attendance_kiosk_school_name', res.school_name || 'Apex Global Academy');
        localStorage.setItem('attendance_kiosk_school_code', res.school_code || schoolCode.toUpperCase());
        localStorage.setItem('attendance_kiosk_paired_at', new Date().toISOString());

        setIsSuccess(true);
        setPairedSchool(res.school_name || 'Your School');

        // Redirect to /kiosk after short pairing animation
        setTimeout(() => {
          router.push('/kiosk');
        }, 1200);
      } catch (err: any) {
        setError(err?.message || 'Failed to establish connection to school server.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased">
      {/* Top Header - Matches Principal Dashboard Executive Design System */}
      <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <Building2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                Attendance Hub Kiosk
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                FRONT DESK TERMINAL
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Hardware Terminal Pairing &bull; Standalone Check-In Station
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-xs transition"
          >
            <LayoutDashboard size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Principal Dashboard</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft size={13} />
            <span>Login</span>
          </Link>
        </div>
      </header>

      {/* Main Setup Card Container */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="w-13 h-13 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 mb-3 shadow-xs">
              <KeyRound size={24} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pair Front Desk Kiosk
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Enter your institution&apos;s School Code and Kiosk PIN to lock this device as an official check-in terminal.
            </p>
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-3 animate-in fade-in duration-300">
              <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-emerald-900">Terminal Paired Successfully!</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Bound to <strong>{pairedSchool}</strong>. Launching dynamic QR stream...
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !isSuccess && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-rose-900">Pairing Verification Failed</div>
                <div className="text-rose-700 text-[11px] mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="school_code"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                School Code (6 Digits)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 size={16} />
                </div>
                <input
                  id="school_code"
                  type="text"
                  required
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 100001"
                  maxLength={10}
                  disabled={isPending || isSuccess}
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition tracking-wider"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="kiosk_pin"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Kiosk Master PIN (4 Digits)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="kiosk_pin"
                  type="password"
                  required
                  value={kioskPin}
                  onChange={(e) => setKioskPin(e.target.value)}
                  placeholder="••••"
                  maxLength={6}
                  disabled={isPending || isSuccess}
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || isSuccess}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-white" />
                  <span>Verifying Master PIN...</span>
                </>
              ) : isSuccess ? (
                <>
                  <ShieldCheck size={16} className="text-white" />
                  <span>Terminal Paired</span>
                </>
              ) : (
                <>
                  <span>Authenticate &amp; Lock Kiosk</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for Fast Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Setup Demo Preset
            </span>
            <button
              type="button"
              onClick={handleFillDemo}
              disabled={isPending || isSuccess}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 transition text-xs text-slate-700 flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-indigo-600" />
                <div>
                  <span className="font-semibold text-slate-900 group-hover:text-indigo-700 transition">
                    Apex Global Academy
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    Code: 100001 &bull; PIN: 1234
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Auto-fill
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 max-w-md mx-auto w-full py-4">
        Front Desk Kiosk &bull; Cryptographic Pairing &bull; Standalone Terminal
      </footer>
    </div>
  );
}
