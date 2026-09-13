'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft, Building2, ShieldAlert } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ManageError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Captured dashboard management error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={20} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                SYSTEM RECOVERY
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              Principal Administration &amp; Oversight
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
        >
          <ArrowLeft size={13} />
          <span>Back to Dashboard</span>
        </Link>
      </header>

      {/* Main Error Card */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h1 className="text-lg font-bold text-gray-900 mb-2">
            System Notice
          </h1>

          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            We are experiencing a temporary system interruption. Please try again in a few moments.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => reset()}
              className="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition text-center"
            >
              Return to Live Dashboard
            </Link>
          </div>

          {error?.digest && (
            <p className="mt-4 text-[10px] font-mono text-gray-400">
              Error Reference: {error.digest}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center border-t border-gray-200 bg-white">
        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          Resilient Fallback Interface &bull; Graceful Failure Protection
        </p>
      </footer>
    </div>
  );
}
