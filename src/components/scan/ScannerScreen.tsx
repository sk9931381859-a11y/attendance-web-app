'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Navigation,
  ShieldCheck,
  User,
  Sparkles,
  CameraOff,
} from 'lucide-react';
import Link from 'next/link';
import jsQR from 'jsqr';
import { calculateHaversineDistance, FALLBACK_TEST_STAFF_ID } from '@/lib/geo';
import { submitCheckInAction, CheckInResponse } from '@/app/actions/checkin';

interface ProfileItem {
  id: string;
  name: string;
  shift_start_time?: string;
}

interface ScannerScreenProps {
  initialProfiles: ProfileItem[];
}

const BUILDING_LAT = 22.8046;
const BUILDING_LON = 86.2029;
const MAX_RADIUS = 100;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export default function ScannerScreen({ initialProfiles }: ScannerScreenProps) {
  // Profiles list with fallback test staff profile guaranteed
  const profilesList = React.useMemo(() => {
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
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [testMode, setTestMode] = useState<boolean>(false);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVerifyingRef = useRef<boolean>(false);

  // 1. Geolocation capture with maximumAge: 0
  const acquireLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your mobile browser.');
      return;
    }

    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
        const dist = calculateHaversineDistance(latitude, longitude, BUILDING_LAT, BUILDING_LON);
        setDistance(Math.round(dist));
      },
      (err) => {
        let msg = 'Unable to retrieve your location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow GPS access.';
        else if (err.code === 2) msg = 'GPS position unavailable. Ensure location is enabled.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setGpsError(msg);
      },
      GEO_OPTIONS
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  // 2. Process check-in token (from camera or manual code)
  const handleTokenDetected = useCallback(
    async (rawText: string) => {
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;
      setIsSubmitting(true);

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
        let currentCoords = coords;
        if (!currentCoords) {
          try {
            const pos: GeolocationPosition = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, GEO_OPTIONS)
            );
            currentCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };
            setCoords(currentCoords);
          } catch {
            if (!testMode) {
              setResult({
                success: false,
                message: 'Failed',
                error: 'GPS location is required to verify building perimeter.',
              });
              setIsSubmitting(false);
              isVerifyingRef.current = false;
              return;
            }
            // In test mode fallback coordinates to building
            currentCoords = { lat: BUILDING_LAT, lng: BUILDING_LON, accuracy: 5 };
          }
        }

        const effectiveTeacherId = selectedTeacherId || FALLBACK_TEST_STAFF_ID;

        const res = await submitCheckInAction({
          teacherId: effectiveTeacherId,
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
          token: rawText,
          bypassGeofence: testMode,
        });

        setResult(res);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Check-in failed.';
        setResult({
          success: false,
          message: 'Error',
          error: errorMsg,
        });
      } finally {
        setIsSubmitting(false);
        isVerifyingRef.current = false;
      }
    },
    [coords, selectedTeacherId, testMode]
  );

  // 3. Start Camera Scanner with soft fallbacks
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

  const isWithinGeofence = distance !== null && distance <= MAX_RADIUS;

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
        {/* Diagnostic Banner */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 space-y-2 text-xs backdrop-blur-sm shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-cyan-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              GPS Diagnostics &amp; Telemetry
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                testMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : isWithinGeofence
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {testMode ? 'DEV BYPASS' : isWithinGeofence ? 'IN RANGE' : 'OUT OF BOUNDS'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans mb-0.5">Detected Coordinates</div>
              <div className="text-slate-200 font-semibold truncate">
                {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Searching...'}
              </div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans mb-0.5">Target Building Coordinates</div>
              <div className="text-slate-200 font-semibold truncate">
                {BUILDING_LAT.toFixed(4)}, {BUILDING_LON.toFixed(4)}
              </div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans mb-0.5">Calculated Distance</div>
              <div
                className={`font-bold ${
                  testMode || isWithinGeofence ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {distance !== null ? `${distance} meters` : 'Calculating...'}
              </div>
            </div>
          </div>
        </div>

        {/* Temporary Development / Test Mode Toggle */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Development / Test Mode</div>
              <div className="text-[11px] text-slate-400">Bypass geofencing verification for initial UI validation</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Success View */}
        {result?.success ? (
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-emerald-950/30">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Check-In Confirmed!</h2>
            <p className="text-xs text-slate-400 mb-4">{result.message}</p>

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
              {result.distanceMeters !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Distance to Facility:</span>
                  <span className="font-mono text-emerald-400">
                    {result.distanceMeters} meters {testMode ? '(Bypassed)' : '(Verified)'}
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
                  acquireLocation();
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

            {/* Step 2: GPS Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  GPS Geofencing Status
                </span>
                <button
                  onClick={acquireLocation}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh GPS
                </button>
              </div>

              {gpsError ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{gpsError}</span>
                </div>
              ) : coords ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Distance:</span>
                    <span
                      className={`font-mono font-bold ${
                        testMode || isWithinGeofence ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {distance !== null ? `${distance} meters` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allowed Perimeter:</span>
                    <span className="font-mono text-slate-300">&le; {MAX_RADIUS} meters</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Accuracy: &plusmn;{Math.round(coords.accuracy)}m</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        testMode || isWithinGeofence
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {testMode ? 'Test Bypass Active' : isWithinGeofence ? 'Inside Campus' : 'Out of Bounds'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  Acquiring satellite lock...
                </div>
              )}
            </div>

            {/* Rejection Alert */}
            {result && !result.success && (
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-start gap-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-200">Check-In Rejected</div>
                  <div className="mt-0.5 text-rose-300/90">{result.error || 'Verification failed.'}</div>
                </div>
              </div>
            )}

            {/* Step 3: Camera Component */}
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
                  Verifying GPS geofence &amp; TOTP token...
                </div>
              )}

              {cameraError && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-left">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual One-Time Code Fallback */}
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
        Attendance Web App &bull; Geofencing Perimeter Enforcement (100m)
      </footer>
    </div>
  );
}
