'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  LogOut,
  ShieldCheck,
  Building2,
  Wallet,
} from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

interface DashboardNavProps {
  adminName: string;
  adminEmail?: string | null;
}

export default function DashboardNav({ adminName, adminEmail }: DashboardNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    {
      label: 'Payroll',
      href: '/dashboard/payroll',
      icon: Wallet,
      isActive: pathname === '/dashboard/payroll',
    },
  ];

  const handleLogout = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  return (
    <header className="relative sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Portal Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-emerald-400 backdrop-blur-md">
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

          {/* Navigation Links Bridging /dashboard, /dashboard/manage, and /dashboard/payroll */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    item.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>

            {/* Mobile Hamburger Button */}
            <button 
              className="md:hidden p-2 ml-auto text-slate-300 hover:text-white focus:outline-none" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden flex flex-col px-4 pt-2 pb-4 space-y-2 bg-[#0B0F19] border-b border-white/10 shadow-xl w-full absolute left-0 top-full z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  item.isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
