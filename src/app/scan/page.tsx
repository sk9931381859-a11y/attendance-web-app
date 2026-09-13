'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Building2,
  LogOut,
  Clock,
  Smartphone,
  ShieldAlert,
  Delete,
  Check,
  KeyRound,
} from 'lucide-react';
import jsQR from 'jsqr';
import { createClient } from '@/lib/supabase/client';
import {
  submitCheckInAction,
  CheckInResponse,
  ScannerSession,
} from '@/app/actions/checkin';
import { getOrCreateDeviceId } from '@/lib/device';

interface CheckInError {
  message: string;
  details?: string;
  deviceLocked?: boolean;
}

export default function ScanPage() {
  const router = useRouter();

  // Session & Device State
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [deviceId, setDeviceId] = useState<string>('');

  // Scanner & Submission State
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
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize persistent device UUID
  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, []);

  // Format scheduled shift start time (e.g. '08:00:00' -> '08:00 AM')
  const formatShiftTime = (timeStr?: string | null) => {
    if (!timeStr) return '08:00 AM';
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // 1. Verify Authenticated Session on Mount
  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, role, shift_start_time, designation, registered_device_id, device_locked_at, company_id')
        .eq('id', user.id)
        .maybeSingle();

      setSession({
        user: { id: user.id, email: user.email },
        profile: profile || {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Staff Member',
          email: user.email,
          role: 'staff',
          shift_start_time: '08:00:00',
          designation: null,
          registered_device_id: null,
          device_locked_at: null,
          company_id: user.user_metadata?.company_id || '11111111-1111-1111-1111-111111111111',
        },
      });
    } catch (err) {
      console.error('Failed to load scanner session:', err);
      router.push('/login');
    } finally {
      setLoadingSession(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadSession();
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSession, router]);

  // 2. Sign Out
  const handleSignOut = async () => {
    stopScanner();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // 3. Token Check-In Handler with Device Lock Verification
  const handleTokenDetected = useCallback(
    async (rawText: string) => {
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      // Stop camera during verification
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
        const currentDeviceId = deviceId || getOrCreateDeviceId();
        const verifyRes = await submitCheckInAction({
          token: rawText,
          device_id: currentDeviceId,
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

          const isDeviceLocked =
            Boolean(verifyRes.deviceLocked) ||
            errorMessage.toLowerCase().includes('unauthorized device') ||
            errorMessage.toLowerCase().includes('locked to another phone');

          setError({
            message: errorMessage,
            details: errorDetails,
            deviceLocked: isDeviceLocked,
          });
          setIsSubmitting(false);
          isVerifyingRef.current = false;
          return;
        }

        // Duplicate check-in today
        if (verifyRes.alreadyCheckedIn) {
          setAlreadyCheckedInNotice(true);
          setResult({
            success: true,
            message: 'Already Checked In Today',
            teacherName: verifyRes.teacherName || session?.profile.name || 'Staff Member',
            teacherEmail: verifyRes.teacherEmail || session?.profile.email || undefined,
            checkInTime: verifyRes.checkInTime || new Date().toISOString(),
            status: verifyRes.status || 'present',
            alreadyCheckedIn: true,
          });
          setIsSubmitting(false);
          isVerifyingRef.current = false;
          return;
        }

        // Successful new check-in
        setResult({
          success: true,
          message: verifyRes.message || 'Attendance recorded successfully.',
          teacherName: verifyRes.teacherName || session?.profile.name || 'Staff Member',
          teacherEmail: verifyRes.teacherEmail || session?.profile.email || undefined,
          checkInTime: verifyRes.checkInTime || new Date().toISOString(),
          status: verifyRes.status || 'present',
          alreadyCheckedIn: false,
        });

        // Reset manual code
        setManualCode('');

        // Refresh profile to reflect bound device state
        loadSession();
      } catch (err: unknown) {
        console.error('Submission error:', err);
        setError({
          message: err instanceof Error ? err.message : 'Unexpected check-in error.',
          details: typeof err === 'object' && err !== null ? JSON.stringify(err, null, 2) : String(err),
        });
      } finally {
        setIsSubmitting(false);
        isVerifyingRef.current = false;
      }
    },
    [deviceId, session, loadSession]
  );

  // 4. Camera Controls
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
        console.error('Camera access failed:', err);
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Camera permission denied. Please allow camera access.'
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
        console.warn('Video playback interrupted:', playErr);
      }
    }
  }, []);

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
          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvasRef.current = canvas;
          }
          canvas.width = width;
          canvas.height = height;

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

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Keypad Handlers
  const handleKeypadPress = (digit: string) => {
    if (manualCode.length >= 6) return;
    const next = manualCode + digit;
    setManualCode(next);
    if (next.length === 6) {
      handleTokenDetected(next);
    }
  };

  const handleKeypadBackspace = () => {
    setManualCode((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setManualCode('');
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode || manualCode.trim().length < 6) return;
    handleTokenDetected(manualCode.trim());
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900 flex flex-col justify-between font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* 1. NATIVE-FEEL APP HEADER                                                  */}
      {/* ========================================================================= */}
      <header className="border-b border-gray-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
            <Building2 size={18} className="text-teal-600" />
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
              Mobile Staff Verification
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-xs"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-xs"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN APP VIEWPORT (FULL-SCREEN MOBILE LAYOUT)                          */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 flex flex-col justify-start space-y-4">
        {/* Loading Session */}
        {loadingSession ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm my-auto">
            <RefreshCw size={26} className="animate-spin mx-auto text-teal-600 mb-3" />
            <p className="text-xs font-semibold text-gray-700">
              Verifying active staff credentials &amp; hardware lock...
            </p>
          </div>
        ) : !session ? (
          /* Redirecting State */
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm my-auto">
            <RefreshCw size={26} className="animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-xs font-semibold text-gray-700">
              Authentication required. Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            {/* =================================================================== */}
            {/* A. SUCCESS STATE CARD                                               */}
            {/* =================================================================== */}
            {result?.success ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm my-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {result.alreadyCheckedIn ? 'Already Checked In Today' : 'Check-In Confirmed!'}
                </h2>
                <p className="text-xs text-gray-500 mb-5">
                  {result.alreadyCheckedIn
                    ? 'Your attendance has already been recorded for today.'
                    : result.message}
                </p>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left space-y-2.5 mb-6 shadow-inner">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Staff Member:</span>
                    <span className="font-semibold text-gray-900">
                      {result.teacherName || session.profile.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Security Identity:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-green-700 text-[11px]">
                      <ShieldCheck size={13} />
                      Verified Session Cookie
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Hardware Binding:</span>
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-teal-700 text-[11px]">
                      <Smartphone size={13} />
                      {deviceId ? `••••${deviceId.slice(-4).startsWith('-') ? deviceId.slice(-4) : `-${deviceId.slice(-4)}`}` : 'Hardware Locked'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Attendance Status:</span>
                    <span
                      className={`font-bold uppercase ${
                        result.status === 'present' ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>
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

                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/dashboard"
                    className="w-full py-3 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition text-center shadow-sm cursor-pointer"
                  >
                    View Live Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                      setAlreadyCheckedInNotice(false);
                      setManualCode('');
                    }}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Done / Scan Another
                  </button>
                </div>
              </div>
            ) : (
              /* =================================================================== */
              /* B. ACTIVE SCANNER & KEYPAD VIEW                                      */
              /* =================================================================== */
              <div className="space-y-4">
                {/* Staff Info Pill Banner (Clean White Card) */}
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {session.profile.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-900 truncate">
                          {session.profile.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={11} className="text-teal-600" />
                            {formatShiftTime(session.profile.shift_start_time)}
                          </span>
                          <span>&bull;</span>
                          <span className="font-mono text-[10px] text-gray-600">
                            {session.profile.registered_device_id ? 'Device Bound' : '1st Device'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="text-[11px] text-gray-500 hover:text-red-600 flex items-center gap-1 transition px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer shrink-0"
                      title="Sign out of scanner"
                    >
                      <LogOut size={13} />
                      <span className="hidden sm:inline">Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Unauthorized Device Lock Alert */}
                {error && error.deviceLocked && (
                  <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 flex items-start gap-3 shadow-xs">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-red-900 text-sm">Unauthorized Device</div>
                      <p className="text-red-800 mt-1 font-medium leading-relaxed">
                        {error.message}
                      </p>
                      <div className="mt-2.5 p-2 bg-red-100/70 rounded-lg border border-red-200 text-[10px] text-red-900 font-normal">
                        Security Notice: Staff accounts are cryptographically bound to a single approved mobile device. Request a device reset from your Principal.
                      </div>
                    </div>
                  </div>
                )}

                {/* Generic Check-In Error Alert */}
                {error && !error.deviceLocked && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5 shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-red-900">Check-In Rejected</div>
                      <p className="text-red-700 mt-0.5 font-medium">{error.message}</p>
                    </div>
                  </div>
                )}

                {/* Already Checked In Banner */}
                {alreadyCheckedInNotice && !error && (
                  <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-start gap-2.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-green-900">Already Checked In Today</div>
                      <p className="text-green-700 text-[11px] mt-0.5">
                        Your attendance has already been logged.
                      </p>
                    </div>
                  </div>
                )}

                {/* =============================================================== */}
                {/* C. CENTERED CAMERA VIEWPORT CARD WITH ROUNDED CORNERS            */}
                {/* =============================================================== */}
                <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col items-center">
                  <div className="relative aspect-square w-full max-w-[270px] sm:max-w-[300px] bg-neutral-950 rounded-2xl overflow-hidden shadow-inner border border-neutral-800 flex items-center justify-center">
                    {/* Video Stream */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
                    />

                    {/* Viewfinder Corner Reticles */}
                    <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-teal-400 rounded-tl pointer-events-none" />
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-teal-400 rounded-tr pointer-events-none" />
                    <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-teal-400 rounded-bl pointer-events-none" />
                    <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-teal-400 rounded-br pointer-events-none" />

                    {/* Scanning Laser Line Animation */}
                    {isScanning && (
                      <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] laser-scanner-line pointer-events-none" />
                    )}

                    {/* Inactive / Error Placeholder */}
                    {!isScanning && (
                      <div className="text-center p-6 text-gray-400 z-10">
                        {cameraError ? (
                          <>
                            <CameraOff className="w-10 h-10 mx-auto text-red-400 mb-2 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-red-400">Camera Unavailable</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs">{cameraError}</p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-2 text-teal-400">
                              <Camera className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-gray-200">Camera Inactive</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-tight">
                              Point camera at the lobby kiosk QR code to scan
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Verification Loading Overlay */}
                    {isSubmitting && (
                      <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-20">
                        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-2" />
                        <span className="text-xs font-bold text-white">
                          Verifying Device &amp; Token...
                        </span>
                        <span className="text-[10px] text-gray-300 mt-0.5">
                          Cryptographically committing check-in
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clean, Dark-Mode Button for "Start Camera" */}
                  <div className="w-full max-w-[270px] sm:max-w-[300px] mt-4">
                    {!isScanning ? (
                      <button
                        onClick={startScanner}
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-6 bg-neutral-950 hover:bg-black active:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98]"
                      >
                        <Camera size={16} className="text-teal-400" />
                        <span>Start Camera Scanner</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopScanner}
                        className="w-full py-3.5 px-6 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <CameraOff size={16} className="text-red-500" />
                        <span>Stop Camera</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* =============================================================== */}
                {/* D. SLEEK NUMERICAL KEYPAD FALLBACK BELOW IT                      */}
                {/* =============================================================== */}
                <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm">
                  {/* Keypad Title & Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                        <KeyRound size={13} />
                      </div>
                      <span className="text-xs font-bold text-gray-900">
                        Manual 6-Digit Code
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      Keypad Fallback
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 mb-3">
                    If camera cannot scan, type the 6-digit code displayed below the kiosk QR code.
                  </p>

                  {/* Hidden Input for Keyboard Typing / Paste Support */}
                  <input
                    ref={hiddenInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={manualCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setManualCode(val);
                      if (val.length === 6) {
                        handleTokenDetected(val);
                      }
                    }}
                    className="sr-only"
                    aria-label="Manual 6-digit TOTP code input"
                  />

                  {/* 6-Digit PIN Display Slots */}
                  <div
                    onClick={() => hiddenInputRef.current?.focus()}
                    className="flex justify-center items-center gap-2 sm:gap-2.5 my-3 cursor-text"
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = manualCode[index];
                      const isCurrent = manualCode.length === index;
                      return (
                        <div
                          key={index}
                          className={`w-9 h-11 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center font-mono text-base sm:text-lg font-bold transition-all ${
                            digit
                              ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs scale-[1.02]'
                              : isCurrent
                              ? 'border-black bg-white ring-2 ring-black/10'
                              : 'border-gray-200 bg-gray-50/60 text-gray-300'
                          }`}
                        >
                          {digit || (isCurrent ? <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" /> : '•')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sleek On-Screen Numerical Keypad (3x4 Grid) */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-4 pt-3 border-t border-gray-100">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleKeypadPress(digit)}
                        disabled={isSubmitting || manualCode.length >= 6}
                        className="h-11 sm:h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 text-gray-900 font-bold text-base sm:text-lg rounded-xl transition shadow-xs flex items-center justify-center active:scale-[0.96] cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}

                    {/* Row 4: Clear / Backspace, 0, Verify */}
                    <button
                      type="button"
                      onClick={handleKeypadBackspace}
                      onDoubleClick={handleKeypadClear}
                      disabled={isSubmitting || manualCode.length === 0}
                      className="h-11 sm:h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 text-gray-700 rounded-xl transition shadow-xs flex items-center justify-center active:scale-[0.96] cursor-pointer"
                      title="Backspace (Double tap to clear)"
                      aria-label="Delete digit"
                    >
                      <Delete size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      disabled={isSubmitting || manualCode.length >= 6}
                      className="h-11 sm:h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 text-gray-900 font-bold text-base sm:text-lg rounded-xl transition shadow-xs flex items-center justify-center active:scale-[0.96] cursor-pointer"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManualSubmit()}
                      disabled={isSubmitting || manualCode.length < 6}
                      className={`h-11 sm:h-12 rounded-xl transition shadow-xs flex items-center justify-center gap-1 font-semibold text-xs active:scale-[0.96] cursor-pointer ${
                        manualCode.length === 6
                          ? 'bg-black hover:bg-gray-800 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 disabled:opacity-40'
                      }`}
                      aria-label="Verify code"
                    >
                      <Check size={16} />
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. NATIVE APP FOOTER                                                       */}
      {/* ========================================================================= */}
      <footer className="py-3 px-4 text-center border-t border-gray-200/80 bg-white/95">
        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Cryptographic Device Binding &bull; 30s Anti-Cheat TOTP Protocol</span>
        </p>
      </footer>
    </div>
  );
}
