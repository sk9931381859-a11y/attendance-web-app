import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white font-mono">
            ZenithFlow
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/services"
              className="text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Services
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 transition"
            >
              Register Company
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero & Products Grid */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-teal-400 uppercase bg-teal-950/60 border border-teal-800/60 rounded-full">
            Enterprise Cloud Solutions
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Streamlining Business Infrastructure.
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Modern, automated platforms purpose-built for institutional verification, workforce operations, and real-time oversight.
          </p>
        </section>

        {/* Products Grid */}
        <section>
          <div className="max-w-md mx-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-xl hover:border-slate-700 transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 font-bold text-lg font-mono">
                  ZF
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Attendance Web App
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                  Institutional check-in ecosystem featuring dynamic rotating TOTP anti-cheat kiosks, mobile GPS geofencing, and real-time principal oversight.
                </p>
              </div>

              <div>
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center font-semibold px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm transition shadow-lg shadow-teal-500/10"
                >
                  Register Company
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} ZenithFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}
