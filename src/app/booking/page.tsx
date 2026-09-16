'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

// --- Inline ZenithFlowHQ Neon SVG Logo ---
function ZenithFlowLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id="z-glow-booking" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#B200FF" />
        </linearGradient>
        <filter id="neon-blur-booking" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M25 25 H75 L25 75 H75" stroke="url(#z-glow-booking)" strokeWidth="6" strokeLinejoin="round" filter="url(#neon-blur-booking)" />
      <path d="M25 25 L50 50 L75 25 M25 75 L50 50 L75 75 M40 25 L25 50 L60 75" stroke="url(#z-glow-booking)" strokeWidth="2" opacity="0.6" />
      <circle cx="25" cy="25" r="4" fill="#00E5FF" />
      <circle cx="75" cy="25" r="4" fill="#00E5FF" />
      <circle cx="25" cy="75" r="4" fill="#B200FF" />
      <circle cx="75" cy="75" r="4" fill="#B200FF" />
      <circle cx="50" cy="50" r="3" fill="#6677FF" />
      <circle cx="40" cy="25" r="2.5" fill="#00E5FF" />
      <circle cx="60" cy="75" r="2.5" fill="#B200FF" />
      <circle cx="25" cy="50" r="2.5" fill="#33AAFF" />
    </svg>
  );
}

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased flex flex-col justify-between selection:bg-[#0066CC]/20 selection:text-[#0066CC]">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-40 bg-[#F5F5F7]/80 backdrop-blur-md border-b border-[#E5E5EA]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <ZenithFlowLogo />
            <span className="font-bold text-sm tracking-wide text-[#1D1D1F]">
              ZENITH <span className="flow-text-anim font-extrabold">FLOW^</span>HQ
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#1D1D1F] hover:text-[#0066CC] px-4 py-2 rounded-full bg-white border border-[#E5E5EA] shadow-sm hover:bg-[#F5F5F7] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full flex flex-col items-center">
        {/* Hero Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-xs font-semibold uppercase tracking-wider mb-4">
            <Calendar className="w-3.5 h-3.5" />
            <span>Technical Discovery Session</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-[#1D1D1F] tracking-tight mb-4">
            Schedule Technical Discovery
          </h1>

          <p className="text-sm sm:text-base text-[#86868B] leading-relaxed max-w-xl mx-auto">
            Book a dedicated 30-minute discovery session with our engineering leads to review your architecture, evaluate custom automations, or scope bespoke software development.
          </p>

          {/* Quick Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-[#86868B]">
            <div className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0066CC]" />
              <span>30-Min High-Impact Strategy</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0066CC]" />
              <span>Zero-Commitment Assessment</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0066CC]" />
              <span>Direct Lead Engineer Access</span>
            </div>
          </div>
        </div>

        {/* 3. Embedded Iframe Container (Max-Width: 800px, Centered) */}
        <div className="w-full max-w-[800px] mx-auto bg-white rounded-[24px] p-3 sm:p-6 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <div className="w-full h-[600px] rounded-[12px] overflow-hidden bg-[#FAFAFC] relative">
            <iframe
              src="https://tally.so/embed/mK9k2L?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              width="100%"
              height="600px"
              title="Schedule Technical Discovery"
              className="w-full h-full rounded-[12px] border-none"
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
                borderRadius: '12px',
              }}
            />
          </div>

          {/* Fallback Direct Contact Bar */}
          <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between text-xs text-[#86868B] gap-2">
            <span>Prefer direct asynchronous correspondence?</span>
            <a
              href="mailto:contact@zenithflowhq.com?subject=Technical%20Discovery%20Inquiry"
              className="font-medium text-[#0066CC] hover:underline"
            >
              contact@zenithflowhq.com &rarr;
            </a>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-[#E5E5EA] py-8 bg-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#86868B]">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} ZENITH FLOW^HQ. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#1D1D1F] transition-colors">Home</Link>
            <Link href="/register" className="hover:text-[#1D1D1F] transition-colors">Register</Link>
            <Link href="/login" className="hover:text-[#1D1D1F] transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
