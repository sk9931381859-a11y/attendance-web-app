'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  LogOut,
  ShieldCheck,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

interface DashboardNavProps {
  adminName: string;
  adminEmail?: string | null;
}

export default function DashboardNav({ adminName, adminEmail }: DashboardNavProps) {
  const pathname = usePathname();
  const [isLoggingOut, startLogout] = useTransition();

  const navItems = [
    {
      label: 'Live Monitoring',
      href: '/dashboard',
      icon: BarChart3,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Staff Directory',
      href: '/dashboard/manage',
      icon: Users,
      isActive: pathname === '/dashboard/manage',
    },
  ];

  const handleLogout = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Portal Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">
                  Attendance Hub
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Principal Administration & Oversight
              </p>
            </div>
          </div>

          {/* Navigation Links Bridging /dashboard and /dashboard/manage */}
          <nav className="flex items-center gap-1 sm:gap-2 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                    item.isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Admin Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-white leading-tight">
                {adminName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {adminEmail || 'admin@school'}
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
