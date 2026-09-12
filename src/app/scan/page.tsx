'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  User,
  CameraOff,
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  Clock,
  Briefcase,
} from 'lucide-react';
import jsQR from 'jsqr';
import { createClient } from '@/lib/supabase/client';
import {
  submitCheckInAction,
  getScannerSessionAction,
  CheckInResponse,
  ScannerSession,
} from '@/app/actions/checkin';

interface CheckInError {
  message: string;
  details?: string;
}

export default function ScanPage() {
  // Session State
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  // Login Form State (when unauthenticated)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Helper: Format shift time
  const formatShiftTime = (timeStr?: string | null) => {
    if (!timeStr) return '08:00 AM';
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // 1. Check Authenticated Session on Mount
  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSession(null);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, role, shift_start_time, designation')
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
        },
      });
    } catch (err) {
      console.error('Failed to load scanner session:', err);
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    loadSession();

    // Subscribe to auth changes via Supabase client
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadSession();
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSession]);

  // 2. Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const email = loginEmail.trim();
    const password = loginPassword.trim();

    if (!email || !password) {
      setLoginError('Please enter both your email address and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr || !data.user) {
        setLoginError(authErr?.message || 'Invalid email or password.');
        setIsLoggingIn(false);
        return;
      }

      // Fetch profile and transition immediately
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, role, shift_start_time, designation')
        .eq('id', data.user.id)
        .maybeSingle();

      setSession({
        user: { id: data.user.id, email: data.user.email },
        profile: profile || {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Staff Member',
          email: data.user.email,
          role: 'staff',
          shift_start_time: '08:00:00',
          designation: null,
        },
      });
    } catch (err: unknown) {
      console.error('Login error:', err);
      setLoginError(err instanceof Error ? err.message : 'An unexpected error occurred during login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick Demo Helper
  const handleFillDemoTeacher = () => {
    setLoginEmail('teacher@attendance.app');
    setLoginPassword('StaffPassword123!');
    setLoginError(null);
  };

  const handleFillDemoAdmin = () => {
    setLoginEmail('admin@attendance.app');
    setLoginPassword('AdminPassword123!');
    setLoginError(null);
  };

  // 3. Handle Sign Out
  const handleSignOut = async () => {
    stopScanner();
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
    setResult(null);
    setError(null);
  };

  // 4. Check-in submission handler (Server Action strictly extracts teacher_id from session cookie)
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
        // Step 1: Submit token via Server Action
        // NOTE: teacherId is strictly NOT passed from the client.
        // The server extracts teacher_id from the authenticated user's session cookie.
        const verifyRes = await submitCheckInAction({
          token: rawText,
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

        // Handle duplicate check-in today
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
      } catch (err: unknown) {
        console.error('Submission catch block error:', err);
        const errObj: CheckInError = {
          message: err instanceof Error ? err.message : 'Unexpected check-in error.',
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
    [session]
  );

  // 5. Camera Controls
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

  // Manual code submission handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode || manualCode.trim().length < 6) return;
    handleTokenDetected(manualCode.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20">
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
        {/* Loading Session View */}
        {loadingSession ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <RefreshCw size={24} className="animate-spin mx-auto text-teal-600 mb-3" />
            <p className="text-xs font-semibold text-gray-700">
              Verifying active staff session...
            </p>
          </div>
        ) : !session ? (
          /* ========================================================================= */
          /* 3. SUPABASE EMAIL/PASSWORD LOGIN SCREEN (When unauthenticated)             */
          /* ========================================================================= */
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-3 shadow-sm">
                <Lock size={22} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">
                Staff Check-In Login
              </h1>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Sign in with your registered email and password to activate your personalized scanner with cryptographic identity proof.
              </p>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-800">Authentication Failed</div>
                  <div className="text-red-700 text-[11px] mt-0.5">{loginError}</div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. teacher@attendance.app"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Sign In to Scanner</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials helper */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
                Quick Demo Credentials
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={handleFillDemoTeacher}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-[11px] text-gray-700 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900">Teacher: Prof. Sarah Connor</span>
                  <span className="text-gray-400 font-mono text-[10px]">teacher@attendance.app</span>
                </button>
                <button
                  type="button"
                  onClick={handleFillDemoAdmin}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-[11px] text-gray-700 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900">Principal: Admin</span>
                  <span className="text-gray-400 font-mono text-[10px]">admin@attendance.app</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 4. AUTHENTICATED SCANNER VIEW                                             */
          /* ========================================================================= */
          <>
            {/* Success Confirmation Card */}
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
                      {result.teacherName || session.profile.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Identity Source:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-green-700 text-[11px]">
                      <ShieldCheck size={13} />
                      Verified Session Cookie
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
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition cursor-pointer"
                  >
                    Done / Scan Another
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Authenticated Staff Profile Card (Cryptographically Bound) */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0">
                        {session.profile.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          {session.profile.name}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {session.profile.email || session.user.email}
                        </div>
                      </div>
                    </div>

                    {/* Verified Session Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                      <ShieldCheck size={12} className="text-green-600" />
                      Verified
                    </span>
                  </div>

                  {/* Shift & Role Details */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-600">
                        <Clock size={12} className="text-gray-400" />
                        Shift: {formatShiftTime(session.profile.shift_start_time)}
                      </span>
                      {session.profile.designation && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <Briefcase size={12} className="text-gray-400" />
                          {session.profile.designation}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="text-[11px] text-gray-500 hover:text-red-600 flex items-center gap-1 transition"
                      title="Sign out of scanner"
                    >
                      <LogOut size={12} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Green Banner: Already Checked In Today */}
                {alreadyCheckedInNotice && !error && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-start gap-3 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-green-900">Already Checked In Today</div>
                      <p className="text-green-700 text-[11px] mt-0.5">
                        Your attendance has already been logged. Further scans will not overwrite your recorded time.
                      </p>
                    </div>
                  </div>
                )}

                {/* Red Banner: Error Alert */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-red-900">Check-In Rejected</div>
                      <p className="text-red-700 mt-0.5 font-medium">{error.message}</p>
                      {error.details && (
                        <pre className="mt-2 text-[10px] font-mono bg-red-100/60 p-2 rounded text-red-900 overflow-x-auto whitespace-pre-wrap border border-red-200">
                          {error.details}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Camera Viewport Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm overflow-hidden">
                  <div className="relative aspect-square max-h-[300px] mx-auto bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 shadow-inner">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
                    />

                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none border-[3px] border-green-500/80 m-8 rounded-2xl flex items-center justify-center">
                        <div className="w-full h-0.5 bg-green-400 shadow-[0_0_12px_#4ade80] animate-pulse" />
                      </div>
                    )}

                    {!isScanning && (
                      <div className="text-center p-6 text-gray-400">
                        {cameraError ? (
                          <>
                            <CameraOff className="w-10 h-10 mx-auto text-red-400 mb-2 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-red-400">Camera Unavailable</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs">{cameraError}</p>
                          </>
                        ) : (
                          <>
                            <Camera className="w-10 h-10 mx-auto text-gray-500 mb-2 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-gray-300">Camera Inactive</p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Click below to start scanning the lobby kiosk QR code
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {isSubmitting && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                        <RefreshCw className="w-8 h-8 text-black animate-spin mb-2" />
                        <span className="text-xs font-bold text-gray-900">
                          Verifying Authenticated Session...
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          Cryptographically binding attendance record to {session.profile.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {!isScanning ? (
                      <button
                        onClick={startScanner}
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>Start Camera Scanner</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopScanner}
                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <CameraOff size={14} />
                        <span>Stop Camera</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Manual 6-Digit Code Fallback */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Manual 6-Digit TOTP Code
                    </span>
                    <span className="text-[10px] text-gray-400">Fallback Input</span>
                  </div>
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 849201"
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-center tracking-widest text-gray-900 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || manualCode.length < 6}
                      className="px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition shadow-sm"
                    >
                      Verify
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 5. FOOTER NOTICE                                                          */}
      {/* ========================================================================= */}
      <footer className="p-4 text-center border-t border-gray-200 bg-white">
        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-teal-600" />
          Cryptographically signed session check-in &bull; Anti-Cheat TOTP Protocol
        </p>
      </footer>
    </div>
  );
}
