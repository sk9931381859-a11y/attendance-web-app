'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import {
  QrCode,
  ExternalLink,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
  Menu,
  Sparkles,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';

interface AdminHeaderProps {
  adminName: string;
  adminEmail?: string | null;
  schoolName?: string | null;
  onOpenMobileMenu?: () => void;
}

export default function AdminHeader({
  adminName,
  adminEmail,
  schoolName,
  onOpenMobileMenu,
}: AdminHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Mobile Toggle + Context Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
            Institutional Dashboard
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {schoolName || 'Apex Global Academy'} &bull; Real-time Oversight
          </p>
        </div>
      </div>

      {/* Right: Launch Scanner Kiosk Button + Principal Profile Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Prominent "Launch Scanner Kiosk" button */}
        <a
          href="/kiosk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm rounded-md px-3 sm:px-4 py-2 shadow-xs transition active:scale-95 group"
          title="Open Headless Scanner Kiosk in New Tab"
        >
          <QrCode size={16} className="group-hover:scale-110 transition-transform" />
          <span>Launch Scanner Kiosk</span>
          <ExternalLink size={13} className="text-indigo-200 opacity-80" />
        </a>

        {/* Principal Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
            aria-expanded={isDropdownOpen}
          >
            {/* Avatar Initials Badge */}
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              {getInitials(adminName)}
            </div>

            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-900 leading-none">
                {adminName}
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                Principal (Admin)
              </span>
            </div>

            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-slate-700' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu Modal */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-150">
              {/* Profile Card Summary */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-900 truncate">{adminName}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{adminEmail || 'admin@attendance.app'}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  <span>Full Administrative Privileges</span>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="py-1">
                <Link
                  href="/kiosk/setup"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  <QrCode size={14} className="text-slate-400" />
                  <span>Pair Front Desk Terminal</span>
                </Link>

                <Link
                  href="/faculty"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  <User size={14} className="text-slate-400" />
                  <span>Switch to Faculty View</span>
                </Link>
              </div>

              {/* Sign Out Option */}
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                >
                  <LogOut size={14} />
                  <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
