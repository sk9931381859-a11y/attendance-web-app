import Link from 'next/link';
import {
  ShieldCheck,
  QrCode,
  LayoutDashboard,
  ArrowRight,
  Clock,
  Radio,
  Building2,
  Camera,
  MapPin,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Attendance Web App
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Mobile-first institutional check-in platform with dynamic TOTP anti-cheat and real-time dashboard analytics.
          </p>
        </div>

        {/* Primary Staff Check-In Banner */}
        <div className="mb-4">
          <Link
            href="/scan"
            className="group relative bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded-3xl p-6 transition duration-200 hover:shadow-2xl hover:shadow-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    For Teachers
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition mt-1">
                  Staff Check-In Scanner
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Point your mobile camera at the lobby kiosk screen for instant verification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition group-hover:shadow-lg group-hover:shadow-emerald-500/20 self-stretch sm:self-auto justify-center">
              <span>Open Scanner</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>

        {/* Supporting Modules Grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Anti-Cheat Kiosk Card */}
          <Link
            href="/kiosk"
            className="group relative bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition duration-200 hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition duration-200">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-2">
                Anti-Cheat Kiosk
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Lobby screen displaying dynamic TOTP QR code rotating every 30 seconds with live countdown ring.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-400/80">
                <Clock className="w-3 h-3" /> 30s Rotation
              </span>
              <span className="font-mono">/kiosk</span>
            </div>
          </Link>

          {/* Principal's Dashboard Card */}
          <Link
            href="/dashboard"
            className="group relative bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition duration-200 hover:shadow-xl hover:shadow-blue-950/20 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition duration-200">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition flex items-center gap-2">
                Principal Dashboard
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Executive real-time monitoring of today&apos;s Present, Late, and Absent staff with Supabase Realtime sync.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-blue-400/80">
                <Radio className="w-3 h-3" /> Live Realtime
              </span>
              <span className="font-mono">/dashboard</span>
            </div>
          </Link>
        </div>

        {/* Footer Meta */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Next.js 14 App Router &bull; PWA Enabled &bull; Supabase Auth &amp; Realtime</span>
        </div>
      </div>
    </main>
  );
}
