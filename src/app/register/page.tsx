'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Tv,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { registerOrganizationAction } from './actions';
import { generateSlug } from '@/lib/slug';

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = generateSlug(companyName || 'your-school');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await registerOrganizationAction({
        companyName,
        adminName,
        email,
        password,
      });

      if (!res.success) {
        setError(res.error || 'Failed to provision organization workspace.');
        return;
      }

      router.push(res.redirectTo || '/dashboard');
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans text-gray-900">
      {/* 1. TOP MOBILE / TABLET HEADER */}
      <header className="border-b bg-white px-6 py-3.5 flex items-center justify-between shadow-xs md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={18} />
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">Attendance Hub</span>
        </div>
        <Link
          href="/login"
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >
          Sign In
        </Link>
      </header>

      {/* 2. SPLIT-SCREEN CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto my-auto p-4 sm:p-6 lg:p-8 gap-8 items-stretch">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: REGISTRATION FORM                                            */}
        {/* ========================================================================= */}
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-sm">
            {/* Brand Pill & Heading */}
            <div className="mb-6">
              <div className="hidden md:flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
                  <Building2 size={20} />
                </div>
                <span className="text-base font-bold text-gray-900 tracking-tight">Attendance Hub</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 ml-1">
                  SELF-SERVE ONBOARDING
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Create Organization Workspace
              </h1>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Provision your institutional tenant, launch your anti-cheat lobby kiosk, and start tracking verified faculty check-ins.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Organization Name */}
              <div>
                <label
                  htmlFor="reg-company-name"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Organization / School Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Building2 size={16} />
                  </div>
                  <input
                    id="reg-company-name"
                    name="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Horizon Science Academy"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                  />
                </div>
                {/* Dynamic Kiosk URL Preview */}
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                  <span className="text-gray-400">Dedicated Kiosk:</span>
                  <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 truncate max-w-xs">
                    /kiosk/{previewSlug}
                  </span>
                </div>
              </div>

              {/* Field 2: Administrator Name */}
              <div>
                <label
                  htmlFor="reg-admin-name"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Administrator Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    id="reg-admin-name"
                    name="adminName"
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Robert Vance"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Field 3: Work Email Address */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Work Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. principal@horizon.edu"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Field 4: Administrative Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Password (min. 6 characters) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 py-3 bg-black hover:bg-gray-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-md transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Provisioning Tenant Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Organization Workspace</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Link to Sign In */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Already registered your institution?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-teal-700 hover:text-teal-900 hover:underline transition"
                >
                  Sign in to workspace &rarr;
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: DARK/TEAL BRANDING PANEL (MODERN SAAS VALUE PROPOSITION)    */}
        {/* ========================================================================= */}
        <div className="hidden md:flex md:w-1/2 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-8 lg:p-12 flex-col justify-between border border-teal-900/50 shadow-lg relative overflow-hidden">
          {/* Subtle Background Radial Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          {/* Top: Brand Header & Headline */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-700/50 text-teal-300 text-xs font-semibold mb-6">
              <Sparkles size={13} className="text-teal-400" />
              <span>Multi-Tenant Enterprise Architecture</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Institutional Attendance Tracking, <br className="hidden xl:inline" />
              <span className="text-teal-400">Completely Reinvented.</span>
            </h2>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed max-w-md">
              Deploy tamper-proof teacher attendance in minutes. Eliminate hardware badge readers, proxy punching, and paper sign-in sheets forever.
            </p>
          </div>

          {/* Center: 3-Point Value Proposition */}
          <div className="relative z-10 my-8 space-y-5">
            {/* Value Prop 1 */}
            <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                <Tv size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Zero Hardware Required</h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Turn any lobby tablet, display monitor, or smart TV into an instant check-in kiosk without expensive proprietary equipment.
                </p>
              </div>
            </div>

            {/* Value Prop 2 */}
            <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Real-Time Kiosk Anti-Cheat</h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Dynamic 30-second rolling TOTP QR code protocol prevents proxy attendance, photo sharing, and clock tampering.
                </p>
              </div>
            </div>

            {/* Value Prop 3 */}
            <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Frictionless Payroll &amp; Audit</h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Live daily monitoring, automated absent identification via daily pg_cron jobs, and comprehensive 3-month audit history.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom: Compliance & Trust Badges */}
          <div className="relative z-10 pt-6 border-t border-teal-900/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-teal-400" />
              <span>Isolated Tenant Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-teal-400" />
              <span>Cryptographic Device Binding</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="p-4 text-center border-t border-gray-200 bg-white">
        <p className="text-[11px] text-gray-500">
          Attendance Hub &bull; B2B SaaS Self-Serve Onboarding &bull; Zero Hardware Anti-Cheat Attendance
        </p>
      </footer>
    </div>
  );
}
