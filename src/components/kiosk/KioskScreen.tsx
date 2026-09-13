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
  Sparkles,
  Smartphone,
  ExternalLink,
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
      const companyParam = company?.id ? `?companyId=${encodeURIComponent(company.id)}&_t=${Date.now()}` : `?_t=${Date.now()}`;
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

    // Resync immediately when user switches back to this tab / window
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
  const circleRadius = 40;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const timerStrokeColor =
    secondsLeft > 10
      ? 'stroke-teal-600'
      : secondsLeft > 5
      ? 'stroke-yellow-500'
      : 'stroke-red-600';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans select-none">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (UNIFIED WITH DASHBOARD)                             */}
      {/* ========================================================================= */}
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Left: Brand Logo + Text + Tiny KIOSK Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={20} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                {company?.name ? company.name : 'Attendance Hub'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                KIOSK
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              {company?.name ? `${company.name} • Lobby Anti-Cheat Display` : 'Facility Lobby Anti-Cheat Display'}
            </p>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden sm:flex items-center gap-2">
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

        {/* Right: Live Clock & Fullscreen Toggle */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-bold text-gray-900 flex items-center justify-end gap-1.5">
              <Clock size={14} className="text-teal-600" />
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[10px] text-gray-500">{currentDate || 'Loading...'}</div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="bg-black hover:bg-gray-800 text-white rounded-lg p-2 transition shadow-sm"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. CENTRAL KIOSK CARD (HIGH-CONTRAST WHITE CARD)                          */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col items-center text-center">
          {/* Realtime Connected Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Realtime TOTP Active
          </span>

          {/* Heading */}
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center justify-center gap-2">
            Scan to Check In
          </h2>
          {company?.name && (
            <span className="text-xs font-semibold text-teal-700 mt-0.5">
              {company.name}
            </span>
          )}
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Point your mobile camera at this QR code. The token dynamically rotates every 30 seconds.
          </p>

          {/* QR Code Container */}
          <div className="relative p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner group my-5">
            {tokenData ? (
              <div
                className={`transition-opacity duration-300 ${
                  isRefreshing ? 'opacity-30' : 'opacity-100'
                }`}
              >
                <QRCodeSVG
                  value={tokenData.qrPayload}
                  size={230}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg bg-white p-2"
                />
              </div>
            ) : (
              <div className="w-[230px] h-[230px] flex items-center justify-center bg-gray-100 rounded-lg">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            )}

            {/* Refreshing Spinner Overlay */}
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-xl">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            )}
          </div>

          {/* Human-Readable Code (Matching Card 1 Slate Styling) */}
          <div className="w-full bg-slate-400/20 text-slate-800 rounded-xl px-4 py-2.5 border border-slate-300/40 text-xs flex items-center justify-between">
            <span className="font-semibold text-slate-700">One-Time Code:</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-mono font-bold tracking-widest text-teal-700 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-sm">
                {tokenData
                  ? `${tokenData.token.slice(0, 3)} ${tokenData.token.slice(3)}`
                  : '------'}
              </span>
              <button
                type="button"
                onClick={() => refreshToken()}
                disabled={isRefreshing}
                title="Force refresh active QR code"
                aria-label="Force refresh active QR code"
                className="p-1 rounded-md text-gray-600 hover:text-teal-700 hover:bg-white/80 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Countdown Ring */}
          <div className="mt-6 flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  className="stroke-gray-200"
                  strokeWidth="7"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  className={`${timerStrokeColor} transition-all duration-1000 ease-linear`}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Inner Countdown */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-mono font-bold text-gray-900 tracking-tight">
                  {secondsLeft}
                </span>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
                  Sec
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <span>Rotates every 30s</span>
              <button
                onClick={refreshToken}
                disabled={isRefreshing}
                className="text-gray-400 hover:text-teal-600 transition p-1"
                title="Force refresh token"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-gray-200 bg-white px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Anti-Cheat Protected: Time-based tokens expire strictly every 30 seconds.</span>
        </div>
        <div>
          <span>Attendance Web App &bull; Powered by Next.js 14 & Supabase</span>
        </div>
      </footer>
    </div>
  );
}
