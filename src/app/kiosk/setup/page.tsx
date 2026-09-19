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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">
                Attendance Hub Kiosk
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                HEADLESS FRONT DESK
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Terminal Hardware Pairing &bull; No User Session Required
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
        >
          <ArrowLeft size={13} />
          <span>Staff Login</span>
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto text-teal-400 mb-3 shadow-inner">
              <KeyRound size={26} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Pair Front Desk Kiosk
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Enter your institution&apos;s School Code and Kiosk PIN to lock this device as an official check-in terminal.
            </p>
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="mb-6 p-4 bg-teal-950/80 border border-teal-500/50 rounded-xl text-xs text-teal-200 flex items-center gap-3 animate-in fade-in duration-300">
              <ShieldCheck size={22} className="text-teal-400 shrink-0" />
              <div>
                <div className="font-bold text-teal-300">Terminal Paired Successfully!</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  Bound to <strong>{pairedSchool}</strong>. Launching dynamic QR stream...
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !isSuccess && (
            <div className="mb-6 p-3.5 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-red-300">Pairing Verification Failed</div>
                <div className="text-red-300/80 text-[11px] mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="school_code"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                School Code (6 Digits)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono uppercase bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition tracking-wider"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="kiosk_pin"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Kiosk Master PIN (4 Digits)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || isSuccess}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {isPending ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-slate-950" />
                  <span>Verifying Master PIN...</span>
                </>
              ) : isSuccess ? (
                <>
                  <ShieldCheck size={16} className="text-slate-950" />
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
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Setup Demo Preset
            </span>
            <button
              type="button"
              onClick={handleFillDemo}
              disabled={isPending || isSuccess}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 transition text-xs text-slate-300 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-teal-400" />
                <div>
                  <span className="font-semibold text-white group-hover:text-teal-300 transition">
                    Apex Global Academy
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Code: 100001 &bull; PIN: 1234
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                Auto-fill
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 max-w-md mx-auto w-full py-4">
        Front Desk Kiosk &bull; Cryptographic Pairing &bull; Standalone Terminal
      </footer>
    </div>
  );
}
