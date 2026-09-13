'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Building2,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { getKioskTokenAction } from '@/app/actions/kiosk';
import { TOTPResult } from '@/lib/totp';

export interface KioskCompany {
  id: string;
  name: string;
  slug: string;
  subscription_status?: string | null;
}

interface KioskScreenProps {
  initialToken?: TOTPResult;
  company?: KioskCompany | null;
}

export default function KioskScreen({ initialToken, company }: KioskScreenProps) {
  const [tokenData, setTokenData] = useState<TOTPResult | null>(initialToken || null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fetchLock = useRef(false);

  // Sync token from API route scoped to organization company_id (with fallback to Server Action)
  const refreshToken = useCallback(async () => {
    if (fetchLock.current) return;
    fetchLock.current = true;
    setIsRefreshing(true);
    try {
      const companyParam = company?.id
        ? `?companyId=${encodeURIComponent(company.id)}&_t=${Date.now()}`
        : `?_t=${Date.now()}`;
      const res = await fetch(`/api/kiosk/token${companyParam}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokenData(data);
      setSecondsLeft(data.remainingSeconds || 30);
    } catch (err) {
      console.warn('API token sync failed, falling back to server action:', err);
      try {
        const data = await getKioskTokenAction(company?.id);
        setTokenData(data);
        setSecondsLeft(data.remainingSeconds || 30);
      } catch (saErr) {
        console.error('Server action fallback also failed:', saErr);
      }
    } finally {
      setIsRefreshing(false);
      fetchLock.current = false;
    }
  }, [company?.id]);

  // Initialize clock and token
  useEffect(() => {
    if (!tokenData) {
      refreshToken();
    }

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
  }, [refreshToken, tokenData]);

  // Exact wall-clock countdown ticker & automatic resynchronization
  useEffect(() => {
    const updateCountdown = () => {
      if (!tokenData?.expiresAt) {
        return;
      }
      const now = Date.now();
      const msRemaining = tokenData.expiresAt - now;
      const secRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
      setSecondsLeft(secRemaining);

      if (msRemaining <= 0) {
        refreshToken();
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 500);

    // Resync immediately when tab becomes visible or focused
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const msRemaining = (tokenData?.expiresAt || 0) - now;
        if (msRemaining <= 1000) {
          refreshToken();
        } else {
          updateCountdown();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [refreshToken, tokenData?.expiresAt]);

  // Fullscreen toggle
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

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / 30) * 100));
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const timerStrokeColor =
    secondsLeft > 10
      ? 'stroke-teal-600'
      : secondsLeft > 5
      ? 'stroke-amber-500'
      : 'stroke-red-500';

  const companyDisplayName = company?.name || 'Attendance Hub';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (DASHBOARD DESIGN SYSTEM)                           */}
      {/* ========================================================================= */}
      <nav className="border-b border-gray-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-20">
        {/* Left: Brand Logo + Text + Tiny KIOSK Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
            <Building2 size={18} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                {companyDisplayName}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                KIOSK
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              Lobby Anti-Cheat Display Terminal
            </p>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-100 transition"
          >
            Dashboard
          </Link>
          <Link
            href="/scan"
            className="text-gray-600 hover:text-gray-900 px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-100 transition flex items-center gap-1.5"
          >
            <Smartphone size={13} />
            Mobile Scanner
          </Link>
        </div>

        {/* Right: Live Wall Clock & Fullscreen Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-bold text-gray-900 flex items-center justify-end gap-1.5">
              <Clock size={14} className="text-teal-600" />
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[10px] text-gray-500">{currentDate || 'Live Clock'}</div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="bg-black hover:bg-gray-800 text-white rounded-xl p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. CENTRAL LOBBY DISPLAY                                                  */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-10 flex flex-col items-center text-center">
          
          {/* Prominent Company Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 shadow-xs mb-2">
            <Building2 size={13} className="text-teal-600" />
            <span>{company?.slug ? `kiosk/${company.slug}` : 'Official Kiosk'}</span>
          </div>

          {/* Prominent Company Name at the Top */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight max-w-md break-words">
            {companyDisplayName}
          </h1>

          <p className="text-xs text-gray-500 mt-1.5 max-w-xs sm:max-w-sm leading-relaxed">
            Scan the dynamic QR code with your mobile camera to verify attendance.
          </p>

          {/* Realtime Live Status Pill */}
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>Live Anti-Cheat TOTP Active</span>
            </span>
          </div>

          {/* ===================================================================== */}
          {/* HIGHLY VISIBLE CENTERED QR CODE WITH SMOOTH CSS PULSING RING           */}
          {/* ===================================================================== */}
          <div className="relative my-6 p-4 sm:p-5 flex items-center justify-center">
            {/* Smooth CSS Pulsing Ring around the QR code */}
            <div className="absolute inset-0 rounded-3xl kiosk-pulse-ring border-2 border-teal-500/50 pointer-events-none" />

            {/* High-Contrast White QR Card */}
            <div className="relative p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/90 shadow-md">
              {tokenData ? (
                <div
                  className={`transition-opacity duration-300 ${
                    isRefreshing ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  <QRCodeSVG
                    value={tokenData.qrPayload}
                    size={240}
                    level="H"
                    includeMargin={true}
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center bg-gray-50 rounded-xl">
                  <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
                </div>
              )}

              {/* Refreshing Spinner Overlay */}
              {isRefreshing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs rounded-2xl">
                  <RefreshCw className="w-9 h-9 text-teal-600 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* 30-Second Live Rotation Visual Ring & Countdown */}
          <div className="flex items-center justify-center gap-6 w-full max-w-sm pt-2">
            {/* Animated SVG Progress Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 90 90">
                <circle
                  cx="45"
                  cy="45"
                  r={circleRadius}
                  className="stroke-gray-200"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="45"
                  cy="45"
                  r={circleRadius}
                  className={`${timerStrokeColor} transition-all duration-1000 ease-linear`}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-mono font-extrabold text-gray-900 leading-none">
                  {secondsLeft}s
                </span>
                <span className="text-[8px] text-gray-400 uppercase font-semibold mt-0.5">
                  Left
                </span>
              </div>
            </div>

            {/* Human-Readable Fallback Code Box */}
            <div className="flex-1 bg-slate-100/80 text-slate-800 rounded-xl px-3.5 py-2.5 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-500 font-medium">Backup 6-Digit Code:</div>
                <div className="text-sm sm:text-base font-mono font-bold tracking-widest text-teal-800">
                  {tokenData
                    ? `${tokenData.token.slice(0, 3)} ${tokenData.token.slice(3)}`
                    : '------'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => refreshToken()}
                disabled={isRefreshing}
                title="Force refresh token"
                aria-label="Force refresh token"
                className="p-1.5 rounded-lg text-gray-500 hover:text-teal-700 hover:bg-white transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1">
            <Sparkles size={12} className="text-teal-600" />
            <span>Cryptographic TOTP token rotates strictly every 30 seconds</span>
          </p>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. LOBBY SCREEN FOOTER                                                     */}
      {/* ========================================================================= */}
      <footer className="border-t border-gray-200/80 bg-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-teal-600" />
          <span>Tenant Isolated &bull; Active Anti-Cheat Protection &bull; Zero Hardware Required</span>
        </div>
        <div>
          <span>{companyDisplayName} &bull; Powered by Attendance Hub</span>
        </div>
      </footer>
    </div>
  );
}
