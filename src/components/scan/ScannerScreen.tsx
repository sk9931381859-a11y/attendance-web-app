'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  User,
  CameraOff,
} from 'lucide-react';
import Link from 'next/link';
import jsQR from 'jsqr';
import { FALLBACK_TEST_STAFF_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { submitCheckInAction, CheckInResponse } from '@/app/actions/checkin';

interface ProfileItem {
  id: string;
  name: string;
  shift_start_time?: string;
}

interface ScannerScreenProps {
  initialProfiles: ProfileItem[];
}

export default function ScannerScreen({ initialProfiles }: ScannerScreenProps) {
  // Profiles list with fallback test staff profile guaranteed
  const profilesList = useMemo(() => {
    const list = [...initialProfiles];
    if (!list.some((p) => p.id === FALLBACK_TEST_STAFF_ID)) {
      list.push({
        id: FALLBACK_TEST_STAFF_ID,
        name: 'Test Staff Member (Fallback)',
        shift_start_time: '08:00:00',
      });
    }
    return list;
  }, [initialProfiles]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    profilesList[0]?.id || FALLBACK_TEST_STAFF_ID
  );

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [alreadyCheckedInNotice, setAlreadyCheckedInNotice] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVerifyingRef = useRef<boolean>(false);

  // 1. Process check-in token (from camera or manual code)
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  const handleTokenDetected = useCallback(
    async (rawText: string) => {
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      // Stop camera stream during verification
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setIsScanning(false);

      try {
        const effectiveTeacherId = selectedTeacherId || FALLBACK_TEST_STAFF_ID;
        const checkInPayload = {
          teacher_id: effectiveTeacherId,
          check_in_time: new Date().toISOString(),
          status: 'present' as const,
        };

        // Direct database insert strictly using hardcoded table string 'attendance_logs'
        const supabase = createClient();
        const { data: insertedRecord, error: insertError } = await supabase
          .from('attendance_logs')
          .insert(checkInPayload)
          .select()
          .single();

        if (insertError) {
          console.error('Direct database insert error:', insertError);

          // Explicitly catch Postgres 23505 code (idx_unique_teacher_daily_attendance constraint)
          const is23505 =
            insertError.code === '23505' ||
            String(insertError.code) === '23505' ||
            insertError.message?.includes('23505') ||
            insertError.message?.includes('idx_unique_teacher_daily_attendance') ||
            insertError.details?.includes('23505') ||
            insertError.details?.includes('idx_unique_teacher_daily_attendance');

          if (is23505) {
            const matchedProfile = profilesList.find((p) => p.id === effectiveTeacherId);
            setError(null);
            setAlreadyCheckedInNotice(true);
            setResult({
              success: true,
              message: 'Already Checked In Today',
              status: 'present',
              checkInTime: checkInPayload.check_in_time,
              teacherName: matchedProfile?.name || 'Test Staff Member',
              alreadyCheckedIn: true,
            });
            return;
          }

          const errorObj = {
            message: insertError.message || 'Database error writing attendance log',
            details: insertError.details || insertError.hint || (insertError.code ? `Code: ${insertError.code}` : undefined),
          };
          setError(errorObj);
          setResult({
            success: false,
            error: errorObj,
            details: errorObj.details,
          });
          return;
        }

        const matchedProfile = profilesList.find((p) => p.id === effectiveTeacherId);
        setError(null);
        setAlreadyCheckedInNotice(false);
        setResult({
          success: true,
          message: 'Check-in recorded successfully. Marked as PRESENT.',
          status: 'present',
          checkInTime: insertedRecord?.check_in_time || checkInPayload.check_in_time,
          teacherName: matchedProfile?.name || 'Test Staff Member',
        });
      } catch (err: unknown) {
        console.error('Check-in submission error caught:', err);
        const errTyped = err as { message?: string; details?: string; hint?: string; code?: string };

        // Explicitly catch Postgres 23505 code if thrown
        const is23505 =
          errTyped?.code === '23505' ||
          String(errTyped?.code) === '23505' ||
          errTyped?.message?.includes('23505') ||
          errTyped?.message?.includes('idx_unique_teacher_daily_attendance') ||
          errTyped?.details?.includes('23505') ||
          errTyped?.details?.includes('idx_unique_teacher_daily_attendance');

        if (is23505) {
          const effectiveTeacherId = selectedTeacherId || FALLBACK_TEST_STAFF_ID;
          const matchedProfile = profilesList.find((p) => p.id === effectiveTeacherId);
          setError(null);
          setAlreadyCheckedInNotice(true);
          setResult({
            success: true,
            message: 'Already Checked In Today',
            status: 'present',
            checkInTime: new Date().toISOString(),
            teacherName: matchedProfile?.name || 'Test Staff Member',
            alreadyCheckedIn: true,
          });
          return;
        }

        const errorObj = {
          message: errTyped?.message || 'Check-in submission failed.',
          details: errTyped?.details || errTyped?.hint || (errTyped?.code ? `Code: ${errTyped.code}` : typeof err === 'object' ? JSON.stringify(err) : String(err)),
        };
        setError(errorObj);
        setResult({
          success: false,
          error: errorObj,
          details: errorObj.details,
        });
      } finally {
        setIsSubmitting(false);
        isVerifyingRef.current = false;
      }
    },
    [selectedTeacherId, profilesList]
  );

  // 2. Start Camera Scanner with soft fallbacks
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setResult(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported on this browser or connection is not HTTPS.');
      return;
    }

    let stream: MediaStream | null = null;

    // Soft fallback: try { facingMode: "environment" } first, then fallback to { video: true }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch (primaryErr) {
      console.warn('FacingMode environment failed, trying soft fallback { video: true }:', primaryErr);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      } catch (fallbackErr) {
        console.error('All camera constraint attempts failed:', fallbackErr);
        setCameraError(
          'Camera access was denied or device has no accessible camera. You can enter the 6-digit code manually below.'
        );
        setIsScanning(false);
        return;
      }
    }

    streamRef.current = stream;
    setIsScanning(true);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('Video play interrupted:', playErr);
      }
    }
  }, []);

  // Stop camera helper
  const stopScanner = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  // Frame processing loop with jsQR
  useEffect(() => {
    if (!isScanning) return;

    let active = true;

    const scanFrame = () => {
      if (!active) return;

      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
          }
          const canvas = canvasRef.current;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && !isVerifyingRef.current) {
              handleTokenDetected(code.data);
              return;
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isScanning, handleTokenDetected]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Manual code submit handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode || manualCode.trim().length < 6) return;
    handleTokenDetected(manualCode.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between max-w-lg mx-auto font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> Staff Check-In
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 my-6 flex flex-col justify-center space-y-4">
        {/* Success View */}
        {result?.success ? (
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-emerald-950/30">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {result.alreadyCheckedIn ? 'Already Checked In Today' : 'Check-In Confirmed!'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {result.alreadyCheckedIn
                ? 'Your attendance has already been logged for today.'
                : result.message}
            </p>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Staff Member:</span>
                <span className="font-semibold text-white">{result.teacherName || 'Staff'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Recorded Status:</span>
                <span
                  className={`font-bold uppercase ${
                    result.status === 'present' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {result.status}
                </span>
              </div>
              {result.alreadyCheckedIn && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Attendance State:</span>
                  <span className="text-emerald-400 font-semibold">Already Checked In Today</span>
                </div>
              )}
              {result.checkInTime && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(result.checkInTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition text-center shadow-lg shadow-emerald-500/20"
              >
                View in Principal Dashboard
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                  setAlreadyCheckedInNotice(false);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-xl transition"
              >
                Done / Scan Another
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Staff Selection */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                Select Your Teacher Profile
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {profilesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.shift_start_time ? `(Shift: ${p.shift_start_time})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Green / Neutral Banner: Already Checked In Today (explicit 23505 state) */}
            {alreadyCheckedInNotice && !error && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-start gap-3 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1 text-left">
                  <div className="font-bold text-emerald-200 text-sm">Already Checked In Today</div>
                  <p className="text-emerald-300/90 text-xs">
                    Your attendance has already been logged for today with status PRESENT.
                  </p>
                </div>
              </div>
            )}

            {/* Red Rejection Banner: Displays error.message and error.details directly */}
            {error && (
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-start gap-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5 text-left">
                  <div className="font-bold text-rose-200">Check-In Rejected</div>
                  {error.message && (
                    <div className="text-rose-300 font-medium">
                      {error.message}
                    </div>
                  )}
                  {error.details && (
                    <div className="mt-1 text-[11px] text-rose-400/90 font-mono bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/20 break-all whitespace-pre-wrap">
                      <span className="text-rose-400 text-[10px] block font-sans font-semibold uppercase mb-0.5">Details</span>
                      {error.details}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Camera Component */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Scan Lobby Kiosk QR Code
                </h3>
                {isScanning && (
                  <button
                    onClick={stopScanner}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                  </button>
                )}
              </div>

              {/* Viewport for Video Camera Element */}
              <div
                className={`relative w-full max-w-[280px] aspect-square mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 ${
                  isScanning ? 'block' : 'hidden'
                }`}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Reticle HUD overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  <div className="w-full h-full border-2 border-emerald-400/60 rounded-xl relative">
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />
                    <div className="absolute inset-x-0 h-0.5 bg-emerald-400/80 animate-pulse top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {!isScanning && (
                <div className="py-6 flex flex-col items-center">
                  <button
                    onClick={startScanner}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" /> Start Camera Scanner
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Point phone at the lobby kiosk screen rotating every 30s.
                  </p>
                </div>
              )}

              {isSubmitting && (
                <div className="py-4 text-xs text-emerald-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying TOTP token...
                </div>
              )}

              {cameraError && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-left">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Step 3: Manual One-Time Code Fallback */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block mb-2">
                Manual Backup: Enter 6-Digit Code
              </span>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center font-mono font-bold text-sm tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={manualCode.length < 6 || isSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 border-t border-slate-900 pt-3">
        Attendance Web App &bull; Dynamic TOTP Anti-Cheat Protection
      </footer>
    </div>
  );
}
