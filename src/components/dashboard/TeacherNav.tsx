'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  QrCode,
  CalendarCheck,
  FileText,
  BookOpen,
  LogOut,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

interface TeacherNavProps {
  teacherName: string;
  teacherEmail?: string | null;
  schoolName?: string | null;
}

export default function TeacherNav({ teacherName, teacherEmail, schoolName }: TeacherNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();

  const navItems = [
    {
      label: 'QR Scanner',
      href: '/scan',
      icon: QrCode,
      isActive: pathname === '/scan',
    },
    {
      label: 'My Attendance',
      href: '/faculty',
      icon: CalendarCheck,
      isActive: pathname === '/faculty',
    },
    {
      label: 'Leave Requests',
      href: '/faculty#leave-section',
      icon: FileText,
      isActive: false,
    },
    {
      label: 'My Syllabus',
      href: '/faculty#syllabus-section',
      icon: BookOpen,
      isActive: false,
    },
  ];

  const handleLogout = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  return (
    <nav className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-20">
      {/* Left: Brand Logo + Institution Name + STAFF Badge */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
          <Building2 size={18} className="text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              {schoolName || 'Attendance Hub'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-mono">
              STAFF
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-normal">
            Faculty Portal &bull; Attendance &amp; Academics
          </p>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <div className="hidden md:flex md:items-center gap-1 bg-gray-100/80 p-1 rounded-full border border-gray-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          return item.isActive ? (
            <span
              key={item.label}
              className="bg-black text-white rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="text-gray-600 hover:text-gray-900 px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 hover:bg-gray-200/60"
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Right: Staff Info + Scanner Button + Sign Out */}
      <div className="flex items-center gap-3">
        <Link
          href="/scan"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition shadow-xs"
        >
          <Smartphone size={13} />
          <span>Launch Scanner</span>
        </Link>

        <div className="text-right hidden lg:block">
          <div className="text-xs font-semibold text-gray-900 leading-tight">
            {teacherName}
          </div>
          <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">
            {teacherEmail || 'faculty@school.edu'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          title="Sign Out"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">{isLoggingOut ? '...' : 'Sign Out'}</span>
        </button>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 focus:outline-none"
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

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute left-0 top-full w-full bg-white border-b border-gray-200 shadow-lg px-4 py-3 space-y-2 z-50">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                item.isActive
                  ? 'bg-black text-white'
                  : 'text-gray-800 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
