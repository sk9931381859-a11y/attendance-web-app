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
} from 'lucide-react';
import Link from 'next/link';
import { calculateHaversineDistance } from '@/lib/geo';
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

export default function ScannerScreen({ initialProfiles }: ScannerScreenProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialProfiles[0]?.id || ''
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<any>(null);
  const isVerifyingRef = useRef(false);

  // 1. Geolocation capture
  const acquireLocation = useCallback(() => {
    if (!navigator.geolocation) {
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  // 2. Process scanned token
  const handleTokenDetected = useCallback(
    async (decodedText: string) => {
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;
      setIsSubmitting(true);

      try {
        // Stop scanner while processing
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop().catch(() => {});
          setIsScanning(false);
        }

        // Coordinates check
        let currentCoords = coords;
        if (!currentCoords) {
          // Attempt last second position fetch
          try {
            const pos: GeolocationPosition = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
            );
            currentCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };
            setCoords(currentCoords);
          } catch {
            setResult({
              success: false,
              message: 'Failed',
              error: 'GPS location is required to verify building perimeter.',
            });
            setIsSubmitting(false);
            isVerifyingRef.current = false;
            return;
          }
        }

        const res = await submitCheckInAction({
          teacherId: selectedTeacherId,
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
          token: decodedText,
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
    [coords, selectedTeacherId]
  );

  // 3. Start Camera Scanner
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          handleTokenDetected(decodedText);
        },
        () => {
          // Ignore transient scan frame misses
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Camera initialization error:', err);
      setCameraError('Camera access denied or device has no camera. You can enter the One-Time Code manually below.');
      setIsScanning(false);
    }
  }, [handleTokenDetected]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

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
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> Staff Check-In
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 my-6 flex flex-col justify-center">
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
                  <span className="font-mono text-emerald-400">{result.distanceMeters} meters (Verified)</span>
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
              {initialProfiles.length > 0 ? (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {initialProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.shift_start_time ? `(Shift: ${p.shift_start_time})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter your UUID (e.g. from Supabase profiles)"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              )}
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
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
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
                        isWithinGeofence ? 'text-emerald-400' : 'text-rose-400'
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
                        isWithinGeofence
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isWithinGeofence ? 'Inside Campus' : 'Out of Bounds'}
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

            {/* Step 3: Camera Scanner Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                Scan Lobby Kiosk QR Code
              </h3>

              {/* Viewport for Html5Qrcode */}
              <div
                id="qr-reader"
                className={`w-full max-w-[280px] mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[200px] flex items-center justify-center ${
                  isScanning ? 'block' : 'hidden'
                }`}
              />

              {!isScanning && (
                <div className="py-6 flex flex-col items-center">
                  <button
                    onClick={startScanner}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
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
                <p className="text-xs text-amber-400 mt-2 text-left">{cameraError}</p>
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
