'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Building2 } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased flex flex-col justify-between">
        {/* Navigation Header */}
        <header className="border-b border-gray-200 bg-white px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
              <Building2 size={18} className="text-teal-600" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <p className="text-[11px] text-gray-500 font-normal">
                System Telemetry &amp; Crash Recovery
              </p>
            </div>
          </div>
        </header>

        {/* Full-Screen Branded Fallback Container */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
            {/* Error Icon */}
            <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto text-red-600 mb-4 shadow-xs">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
              System Error
            </h1>

            {/* Required Fallback Message */}
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              A critical system error has occurred. Our engineering team has been notified. Please tap below to reload the application.
            </p>

            {/* Error Digest (if present) */}
            {error?.digest && (
              <div className="mb-6 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-500 break-all">
                Incident ID: {error.digest}
              </div>
            )}

            {/* Reload App Button */}
            <button
              onClick={() => reset()}
              className="w-full py-3 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <RefreshCw size={14} />
              <span>Reload App</span>
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-3 px-6 text-center border-t border-gray-200 bg-white">
          <p className="text-[11px] text-gray-400">
            Automated Sentry Production Telemetry &bull; Real-Time Crash Monitoring
          </p>
        </footer>
      </body>
    </html>
  );
}
