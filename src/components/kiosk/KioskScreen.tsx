'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Clock, RefreshCw, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { getKioskTokenAction } from '@/app/actions/kiosk';
import { TOTPResult } from '@/lib/totp';

export default function KioskScreen({ initialToken }: { initialToken?: TOTPResult }) {
  const [tokenData, setTokenData] = useState<TOTPResult | null>(initialToken || null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fetchLock = useRef(false);

  // Sync token from Server Action
  const refreshToken = useCallback(async () => {
    if (fetchLock.current) return;
    fetchLock.current = true;
    setIsRefreshing(true);
    try {
      const data = await getKioskTokenAction();
      setTokenData(data);
      setSecondsLeft(data.remainingSeconds);
    } catch (err) {
      console.error('Failed to sync kiosk token:', err);
    } finally {
      setIsRefreshing(false);
      fetchLock.current = false;
    }
  }, []);

  // Initialize clock and token
  useEffect(() => {
    if (!tokenData) {
      refreshToken();
    }

    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      );
    }, 1000);

    return () => clearInterval(clockTimer);
  }, [refreshToken, tokenData]);

  // Exact countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshToken]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / 30) * 100));
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const timerColor =
    secondsLeft > 12 ? 'text-emerald-400 stroke-emerald-500' :
    secondsLeft > 5 ? 'text-amber-400 stroke-amber-500' :
    'text-rose-400 stroke-rose-500';

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 overflow-hidden font-sans select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Attendance Kiosk
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 30s TOTP
              </span>
            </h1>
            <p className="text-xs text-slate-400">Main Facility Lobby Screen</p>
          </div>
        </div>

        {/* Live Clock & Fullscreen Control */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-lg font-mono font-semibold text-slate-100 tracking-wider flex items-center justify-end gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              {currentTime || '--:--:--'}
            </div>
            <div className="text-xs text-slate-400">{currentDate || 'Loading date...'}</div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Kiosk Center Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
          
          {/* Instructions */}
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white tracking-tight flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Scan QR Code to Check In
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Open the teacher PWA scanner on your mobile phone to record your attendance.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="relative p-4 bg-white rounded-2xl shadow-xl shadow-emerald-950/30 group">
            {tokenData ? (
              <div className={`transition-opacity duration-300 ${isRefreshing ? 'opacity-40' : 'opacity-100'}`}>
                <QRCodeSVG
                  value={tokenData.qrPayload}
                  size={240}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>
            ) : (
              <div className="w-[240px] h-[240px] flex items-center justify-center bg-slate-100 rounded-lg">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}

            {/* Refreshing Spinner Overlay */}
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-2xl">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            )}
          </div>

          {/* Backup Human-Readable Code */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">One-Time Code:</span>
            <span className="text-base font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/50">
              {tokenData ? `${tokenData.token.slice(0, 3)} ${tokenData.token.slice(3)}` : '------'}
            </span>
          </div>

          {/* Circular Countdown Progress */}
          <div className="mt-6 flex flex-col items-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  className={`${timerColor} transition-all duration-1000 ease-linear`}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Inner Countdown Number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold text-white tracking-tight">
                  {secondsLeft}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Sec</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
              <span>Rotates every 30 seconds</span>
              <button
                onClick={refreshToken}
                disabled={isRefreshing}
                className="text-slate-400 hover:text-emerald-400 transition p-1"
                title="Force refresh now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Security Badge */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-900 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Anti-Cheat Protected: Screenshots expire in &le; 30 seconds</span>
        </div>
        <div>
          <span>Attendance Web App &bull; Powered by Next.js 14 & Supabase</span>
        </div>
      </footer>
    </div>
  );
}
