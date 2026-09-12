'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global Root Error Caught:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 antialiased font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-white mb-3 tracking-tight">
            System Notice
          </h1>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            We are experiencing a temporary system interruption. Please try again in a few moments.
          </p>

          {error?.digest && (
            <div className="mb-6 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-500">
              Error Code: {error.digest}
            </div>
          )}

          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
