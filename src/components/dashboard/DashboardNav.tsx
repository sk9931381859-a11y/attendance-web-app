'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  Users,
  LogOut,
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
      icon: BarChart2,
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
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left: Brand Logo + Text + Tiny ADMIN Badge */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
          <Building2 size={20} className="text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              Attendance Hub
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
              ADMIN
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-normal">
            Principal Administration & Oversight
          </p>
        </div>
      </div>

      {/* Center: Black Pill Navigation Toggle */}
      <div className="hidden md:flex md:items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          return item.isActive ? (
            <button
              key={item.href}
              className="bg-black text-white rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-sm"
            >
              <Icon size={16} />
              {item.label}
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="text-gray-600 hover:text-gray-900 px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-2"
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right: User Info + Black Sign Out Button */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-gray-900">
            {adminName}
          </div>
          <div className="text-[11px] text-gray-500 font-mono">
            {adminEmail || 'admin@attendance.app'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold transition shadow-sm cursor-pointer"
        >
          <LogOut size={14} />
          <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
        </button>

        {/* Mobile Hamburger Menu Button */}
        <button 
          className="md:hidden p-2 ml-auto text-gray-600 hover:text-gray-900 focus:outline-none" 
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

      {/* Mobile Dropdown Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden flex flex-col px-4 pt-2 pb-4 space-y-2 bg-white border-b border-gray-100 shadow-sm w-full absolute left-0 top-full z-50">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-4 py-3 rounded-lg font-semibold text-xs transition-colors ${
                item.isActive
                  ? 'bg-black text-white'
                  : 'text-gray-800 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
