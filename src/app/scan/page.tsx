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
  Building2,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import jsQR from 'jsqr';
import { FALLBACK_TEST_STAFF_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import {
  getStaffProfilesAction,
  submitCheckInAction,
  CheckInResponse,
  CheckInErrorObject,
} from '@/app/actions/checkin';

interface ProfileItem {
  id: string;
  name: string;
  shift_start_time?: string;
}

interface CheckInError {
  message: string;
  details?: string;
}

export default function ScanPage() {
  const [profiles, setProfiles] = useState<ProfileItem[]>([
    {
      id: FALLBACK_TEST_STAFF_ID,
      name: 'Test Staff Member (Fallback)',
      shift_start_time: '08:00:00',
    },
  ]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(FALLBACK_TEST_STAFF_ID);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState<CheckInError | null>(null);
  const [alreadyCheckedInNotice, setAlreadyCheckedInNotice] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVerifyingRef = useRef<boolean>(false);

  // Load profiles on mount
  useEffect(() => {
    getStaffProfilesAction()
      .then((data) => {
        if (data && data.length > 0) {
          const list = [...data];
          if (!list.some((p) => p.id === FALLBACK_TEST_STAFF_ID)) {
            list.push({
              id: FALLBACK_TEST_STAFF_ID,
              name: 'Test Staff Member (Fallback)',
              shift_start_time: '08:00:00',
            });
          }
          setProfiles(list);
          setSelectedTeacherId(list[0]?.id || FALLBACK_TEST_STAFF_ID);
        }
      })
      .catch((err) => {
        console.error('Failed to load profiles:', err);
      });
  }, []);

  // Check-in submission handler
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
        // Step 1: Verify token via Server Action
        const verifyRes = await submitCheckInAction({
          token: rawText,
          teacherId: selectedTeacherId,
        });

        if (!verifyRes.success) {
          const errorMessage =
            typeof verifyRes.error === 'object' && verifyRes.error !== null
              ? verifyRes.error.message
              : (verifyRes.error as string) || 'Invalid or expired QR code token.';

          const errorDetails =
            typeof verifyRes.error === 'object' && verifyRes.error !== null
              ? verifyRes.error.details
              : verifyRes.details;

          setError({
            message: errorMessage,
            details: errorDetails,
          });
          setIsSubmitting(false);
          isVerifyingRef.current = false;
          return;
        }

        // Step 2: Direct database insert into attendance_logs table
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
            const matchedProfile = profiles.find((p) => p.id === effectiveTeacherId);
            setError(null);
            setAlreadyCheckedInNotice(true);
            setResult({
              success: true,
              message: 'Already Checked In Today',
              teacherName: matchedProfile?.name || 'Staff Member',
              checkInTime: new Date().toISOString(),
              status: 'present',
              alreadyCheckedIn: true,
            });
            setIsSubmitting(false);
            isVerifyingRef.current = false;
            return;
          }

          // Catch exact error object returned by Supabase
          const errObj: CheckInError = {
            message:
              insertError.message ||
              (insertError as any).error_description ||
              'Database error during check-in.',
            details: [
              insertError.details ? `Details: ${insertError.details}` : null,
              insertError.hint ? `Hint: ${insertError.hint}` : null,
              insertError.code ? `Code: ${insertError.code}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
          };

          setError(errObj);
          setIsSubmitting(false);
          isVerifyingRef.current = false;
          return;
        }

        const matchedProfile = profiles.find((p) => p.id === effectiveTeacherId);
        setResult({
          success: true,
          message: 'Attendance recorded successfully as PRESENT.',
          teacherName: matchedProfile?.name || 'Staff Member',
          checkInTime: insertedRecord.check_in_time,
          status: 'present',
          alreadyCheckedIn: false,
        });
      } catch (err: unknown) {
        console.error('Submission catch block error:', err);
        const errObj: CheckInError = {
          message:
            err instanceof Error ? err.message : 'Unexpected check-in error.',
          details:
            typeof err === 'object' && err !== null
              ? JSON.stringify(err, null, 2)
              : String(err),
        };
        setError(errObj);
      } finally {
        setIsSubmitting(false);
        isVerifyingRef.current = false;
      }
    },
    [selectedTeacherId, profiles]
  );

  // Start Camera with soft fallbacks
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setError(null);
    setResult(null);
    setAlreadyCheckedInNotice(false);

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err: unknown) {
        console.error('All camera access failed:', err);
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Could not access camera. Please allow camera permissions.'
        );
        setIsScanning(false);
        return;
      }
    }

    if (!stream) {
      setCameraError('Camera stream could not be initialized.');
      setIsScanning(false);
      return;
    }

    streamRef.current = stream;
    setIsScanning(true);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (UNIFIED WITH DASHBOARD)                             */}
      {/* ========================================================================= */}
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Left: Brand Logo + Text + Tiny SCANNER Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={20} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                SCANNER
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              Staff Attendance Verification Portal
            </p>
          </div>
        </div>

        {/* Right: Quick Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
          >
            <ArrowLeft size={13} />
            <span>Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto space-y-4">
        {/* Success View */}
        {result?.success ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4 shadow-sm animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {result.alreadyCheckedIn ? 'Already Checked In Today' : 'Check-In Confirmed!'}
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              {result.alreadyCheckedIn
                ? 'Your attendance has already been logged for today.'
                : result.message}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left space-y-2.5 mb-6 shadow-inner">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Staff Member:</span>
                <span className="font-semibold text-gray-900">
                  {result.teacherName || 'Staff'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Recorded Status:</span>
                <span
                  className={`font-bold uppercase ${
                    result.status === 'present' ? 'text-green-600' : 'text-yellow-600'
                  }`}
                >
                  {result.status}
                </span>
              </div>
              {result.alreadyCheckedIn && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Attendance State:</span>
                  <span className="text-green-700 font-semibold">
                    Already Checked In Today
                  </span>
                </div>
              )}
              {result.checkInTime && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="font-mono text-gray-800">
                    {new Date(result.checkInTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-lg transition text-center shadow-sm"
              >
                View in Principal Dashboard
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                  setAlreadyCheckedInNotice(false);
                }}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition"
              >
                Done / Scan Another
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Staff Selection Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-600" />
                Select Teacher Profile
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.shift_start_time ? `(Shift: ${p.shift_start_time})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Green / Neutral Banner: Already Checked In Today (explicit 23505 state) */}
            {alreadyCheckedInNotice && !error && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-start gap-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1 text-left">
                  <div className="font-bold text-green-900 text-sm">
                    Already Checked In Today
                  </div>
                  <p className="text-green-800/90 text-xs">
                    Your attendance has already been logged for today with status PRESENT.
                  </p>
                </div>
              </div>
            )}

            {/* Red Rejection Banner: Displays error.message and error.details */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5 text-left">
                  <div className="font-bold text-red-900">Check-In Rejected</div>
                  {error.message && (
                    <div className="text-red-800 font-medium">
                      {error.message}
                    </div>
                  )}
                  {error.details && (
                    <div className="mt-1 text-[11px] text-red-700 font-mono bg-white p-2.5 rounded-lg border border-red-200 break-all whitespace-pre-wrap">
                      <span className="text-red-900 text-[10px] block font-sans font-semibold uppercase mb-0.5">
                        Details
                      </span>
                      {error.details}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Camera Component Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 text-center shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-teal-600" />
                  Scan Lobby Kiosk QR Code
                </h3>
                {isScanning && (
                  <button
                    onClick={stopScanner}
                    className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                  </button>
                )}
              </div>

              {/* Viewport for Video Camera Element */}
              <div
                className={`relative w-full max-w-[280px] aspect-square mx-auto rounded-xl overflow-hidden bg-black border border-gray-300 shadow-inner ${
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
                  <div className="w-full h-full border-2 border-teal-400/80 rounded-xl relative">
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-teal-400" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-teal-400" />
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-teal-400" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-teal-400" />
                    <div className="absolute inset-x-0 h-0.5 bg-teal-400/80 animate-pulse top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {!isScanning && (
                <div className="py-6 flex flex-col items-center">
                  <button
                    onClick={startScanner}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Start Camera Scanner
                  </button>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Point phone at the lobby kiosk screen rotating every 30s.
                  </p>
                </div>
              )}

              {isSubmitting && (
                <div className="py-4 text-xs text-teal-700 font-semibold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  Verifying TOTP token...
                </div>
              )}

              {cameraError && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 text-left">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Step 3: Manual Code Entry Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block mb-2">
                Manual Backup: Enter 6-Digit Code
              </span>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-center font-mono font-bold text-sm tracking-widest text-teal-700 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                />
                <button
                  type="submit"
                  disabled={manualCode.length < 6 || isSubmitting}
                  className="px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-gray-200 bg-white px-6 py-3 text-center text-xs text-gray-500 shadow-sm">
        Attendance Web App &bull; Dynamic TOTP Anti-Cheat Protection
      </footer>
    </div>
  );
}
