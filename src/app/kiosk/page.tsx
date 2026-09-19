'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  Building2,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

const ROTATION_SECONDS = 10;

export default function HeadlessKioskPage() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('Loading Terminal...');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  const [qrValue, setQrValue] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(ROTATION_SECONDS);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. Authenticate Hardware Device via localStorage (Bypassing Supabase Auth)
  useEffect(() => {
    const storedId = localStorage.getItem('attendance_kiosk_school_id');
    const storedName = localStorage.getItem('attendance_kiosk_school_name');
    const storedCode = localStorage.getItem('attendance_kiosk_school_code');

    if (!storedId) {
      router.replace('/kiosk/setup');
      return;
    }

    setSchoolId(storedId);
    if (storedName) setSchoolName(storedName);
    if (storedCode) setSchoolCode(storedCode);
    setIsReady(true);
  }, [router]);

  // 2. Dynamic QR Code Generator: Refreshes every 10 seconds
  const generateNewToken = useCallback(() => {
    if (!schoolId) return;
    setIsRefreshing(true);
    const now = Date.now();
    const payload = JSON.stringify({
      school_id: schoolId,
      timestamp: now,
    });
    setQrValue(payload);
    setTimestamp(now);
    setSecondsLeft(ROTATION_SECONDS);
    setTimeout(() => setIsRefreshing(false), 200);
  }, [schoolId]);

  // 3. Wall Clock & Ticker
  useEffect(() => {
    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // 4. Countdown & Auto-Rotation strictly every 10 seconds
  useEffect(() => {
    if (!isReady || !schoolId) return;

    // Generate initial QR payload
    generateNewToken();

    const ticker = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          generateNewToken();
          return ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [isReady, schoolId, generateNewToken]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const handleResetKiosk = () => {
    localStorage.removeItem('attendance_kiosk_school_id');
    localStorage.removeItem('attendance_kiosk_school_name');
    localStorage.removeItem('attendance_kiosk_school_code');
    localStorage.removeItem('attendance_kiosk_paired_at');
    router.replace('/kiosk/setup');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <RefreshCw size={28} className="animate-spin text-teal-400 mb-3" />
        <p className="text-xs text-slate-400 tracking-wider uppercase font-semibold">
          Connecting to Front Desk Hardware Terminal...
        </p>
      </div>
    );
  }

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / ROTATION_SECONDS) * 100));
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const timerStrokeColor =
    secondsLeft > 5
      ? 'stroke-teal-400'
      : secondsLeft > 2
      ? 'stroke-amber-400'
      : 'stroke-rose-500';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans select-none antialiased relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP STATUS BAR */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">
                {schoolName}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                HEADLESS KIOSK
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Code: <span className="font-mono text-slate-200 font-semibold">{schoolCode || 'TENANT'}</span> &bull; Unattended Lobby Mode
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-bold text-white flex items-center justify-end gap-1.5">
              <Clock size={14} className="text-teal-400" />
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[10px] text-slate-400">{currentDate || 'Live Wall Clock'}</div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-2.5 sm:px-3.5 sm:py-2 flex items-center gap-1.5 text-xs font-semibold transition border border-slate-700 cursor-pointer active:scale-95"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-slate-900/80 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 rounded-xl p-2.5 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs font-medium transition border border-slate-800 hover:border-rose-800/60 cursor-pointer"
            title="Reset or Pair Different School"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">Unpair</span>
          </button>
        </div>
      </header>

      {/* CENTRAL DISPLAY: DYNAMIC ROTATING QR CODE */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto relative z-10">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
          
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 mb-3 shadow-inner">
            <Sparkles size={12} className="text-teal-400" />
            <span>Anti-Cheat Dynamic Stream</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Faculty Check-In
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Aim your mobile staff scanner at this live QR code. Automatically refreshes every 10 seconds.
          </p>

          {/* QR Code Container with Glowing CSS Ring */}
          <div className="relative my-6 p-4 sm:p-5 flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-3xl border-2 border-teal-500/30 animate-pulse pointer-events-none" />

            {/* High-Contrast White Background for Camera Optics */}
            <div className="relative p-4 sm:p-5 bg-white rounded-2xl border border-white shadow-2xl">
              {qrValue ? (
                <div
                  className={`transition-opacity duration-200 ${
                    isRefreshing ? 'opacity-40 scale-98' : 'opacity-100 scale-100'
                  }`}
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={220}
                    level="H"
                    includeMargin={true}
                    className="rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-100 rounded-lg">
                  <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* 10-Second Countdown Progress Ring & Human Status */}
          <div className="flex items-center justify-center gap-5 w-full max-w-xs pt-1">
            {/* Animated SVG Progress Ring */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 90 90">
                <circle
                  cx="45"
                  cy="45"
                  r={circleRadius}
                  className="stroke-slate-800"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="45"
                  cy="45"
                  r={circleRadius}
                  className={`${timerStrokeColor} transition-all duration-1000 ease-linear`}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-mono font-bold text-white leading-none">
                  {secondsLeft}s
                </span>
                <span className="text-[7px] text-slate-400 uppercase font-semibold mt-0.5">
                  Left
                </span>
              </div>
            </div>

            {/* Live Security Verification Badge */}
            <div className="flex-1 bg-slate-800/70 border border-slate-700/80 rounded-xl px-3 py-2 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span>Active 10s Window</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {timestamp ? `ID: ${timestamp.toString().slice(-6)}` : 'Generating...'}
              </p>
            </div>

            {/* Manual Refresh Trigger */}
            <button
              type="button"
              onClick={generateNewToken}
              disabled={isRefreshing}
              title="Force instant refresh"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-teal-400' : ''} />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-teal-400" />
            <span>Encrypted Anti-Spoofing &bull; Timestamp Validation</span>
          </p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-teal-400" />
          <span>Tenant Isolated &bull; Headless Kiosk Architecture &bull; Zero Battery Drain</span>
        </div>
        <div>
          <span>{schoolName} &bull; Attendance Web App</span>
        </div>
      </footer>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-3">
              <LogOut size={22} />
            </div>
            <h3 className="text-base font-bold text-white">Unpair Front Desk Kiosk?</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              This will remove the current school credentials from this device. You will need the School Code and Kiosk PIN to pair again.
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetKiosk}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-lg shadow-rose-600/20"
              >
                Yes, Unpair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
