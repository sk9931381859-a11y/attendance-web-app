'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Lock,
  Mail,
  User,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { registerSchoolAction, RegisterSchoolResult } from './actions';

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<RegisterSchoolResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: '',
    address: '',
    pincode: '',
    adminName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await registerSchoolAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to register school.');
        return;
      }
      setSuccessData(res);
    });
  };

  const copyToClipboard = (text: string, type: 'code' | 'pin') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans text-gray-900">
      {/* 1. HEADER */}
      <header className="border-b bg-white px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={20} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                SaaS ONBOARDING
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              Register New Institutional Tenant Workspace
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
        >
          Existing School? Sign In &rarr;
        </Link>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 my-auto flex flex-col justify-center">
        {successData ? (
          /* SUCCESS MODAL: SHOWS SCHOOL CODE & KIOSK PIN */
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-3 shadow-sm">
                <CheckCircle2 size={28} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Workspace Provisioned Successfully!
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Your institution workspace <strong className="text-gray-900">{successData.schoolName}</strong> is now live.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-teal-500/10 border border-teal-200 rounded-xl p-5 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    6-Digit School Code
                  </span>
                  <div className="text-2xl font-mono font-extrabold text-teal-900 tracking-widest mt-0.5">
                    {successData.schoolCode}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Required by all teachers and administrators to sign in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(successData.schoolCode || '', 'code')}
                  className="px-3 py-1.5 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  {copiedCode ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="border-t border-teal-200/60 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    4-Digit Kiosk PIN
                  </span>
                  <div className="text-2xl font-mono font-extrabold text-teal-900 tracking-widest mt-0.5">
                    {successData.kioskPin}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Used on the reception/tablet to launch the headless check-in kiosk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(successData.kioskPin || '', 'pin')}
                  className="px-3 py-1.5 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  {copiedPin ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
                  <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push(successData.redirectTo || '/dashboard')}
                className="flex-1 py-3 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Enter Admin Dashboard</span>
                <ArrowRight size={15} />
              </button>

              <Link
                href="/kiosk/setup"
                className="px-4 py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 text-center"
              >
                <QrCode size={15} />
                <span>Launch Kiosk Setup</span>
              </Link>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-3 shadow-sm">
                <Sparkles size={22} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Register Your Institution
              </h1>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Provision a dedicated multi-tenant attendance workspace with anti-cheat QR and payroll engine.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-800">Registration Error</div>
                  <div className="text-red-700 text-[11px] mt-0.5">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Institution Info */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  1. Institution Details
                </span>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    School / College Name *
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute inset-y-0 left-3 my-auto text-gray-400" />
                    <input
                      name="schoolName"
                      type="text"
                      required
                      placeholder="e.g. St. Xavier's Senior Secondary School"
                      value={formData.schoolName}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Campus Address
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute inset-y-0 left-3 my-auto text-gray-400" />
                      <input
                        name="address"
                        type="text"
                        placeholder="e.g. 12th Park Street, North Campus"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      name="pincode"
                      type="text"
                      placeholder="e.g. 560100"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                  </div>
                </div>
              </div>

              {/* Principal / Admin Account */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  2. Principal / Administrator Credentials
                </span>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Principal Full Name *
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute inset-y-0 left-3 my-auto text-gray-400" />
                    <input
                      name="adminName"
                      type="text"
                      required
                      placeholder="e.g. Dr. Arthur Pendelton"
                      value={formData.adminName}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Administrative Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute inset-y-0 left-3 my-auto text-gray-400" />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="e.g. principal@institution.edu"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Master Password *
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute inset-y-0 left-3 my-auto text-gray-400" />
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Provisioning School Workspace...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>Create School Workspace & Generate Codes</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="text-center text-[11px] text-gray-500 max-w-md mx-auto w-full py-4">
        Attendance Hub SaaS &bull; Multi-Tenant Architecture &amp; RLS Isolation
      </footer>
    </div>
  );
}
