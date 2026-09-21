'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Users,
  Wallet,
  GraduationCap,
  Building2,
  BookOpen,
  X,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

interface SidebarProps {
  schoolName?: string | null;
  schoolCode?: string | null;
  initialCollapsed?: boolean;
}

export default function Sidebar({
  schoolName = 'Apex Global Academy',
  schoolCode = '100001',
  initialCollapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Restore collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
    } catch {}
  };

  // Listen for mobile open event triggered from AdminHeader
  useEffect(() => {
    const handleOpenMobile = () => setIsMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', handleOpenMobile);
    return () => window.removeEventListener('open-mobile-sidebar', handleOpenMobile);
  }, []);

  const navItems = [
    {
      label: 'Live Monitoring',
      href: '/dashboard',
      icon: Activity,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Staff Directory',
      href: '/dashboard/manage',
      icon: Users,
      isActive: pathname.startsWith('/dashboard/manage'),
    },
    {
      label: 'Payroll',
      href: '/dashboard/payroll',
      icon: Wallet,
      isActive: pathname.startsWith('/dashboard/payroll'),
    },
    {
      label: 'Academics & Syllabus',
      href: '/dashboard/academics',
      icon: BookOpen,
      isActive: pathname.startsWith('/dashboard/academics'),
    },
    {
      label: 'Academic Oversight',
      href: '/dashboard/oversight',
      icon: GraduationCap,
      isActive: pathname.startsWith('/dashboard/oversight'),
    },
  ];

  const handleCopyCode = () => {
    if (schoolCode) {
      navigator.clipboard.writeText(schoolCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP COLLAPSIBLE SIDEBAR                                             */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col sticky top-0 h-screen shrink-0 bg-white border-r border-slate-200 text-slate-600 z-30 transition-all duration-200 select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex flex-col h-full justify-between overflow-x-hidden">
          {/* Top Section: Header + Navigation */}
          <div>
            {/* Header: Logo, School Name, & Collapse Toggle Button */}
            <div
              className={`h-16 flex items-center border-b border-slate-200 bg-slate-50/70 transition-all duration-200 ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
              }`}
            >
              {!isCollapsed ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs shrink-0">
                      <Building2 size={17} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold text-slate-900 tracking-tight leading-none truncate">
                        {schoolName || 'Apex Academy'}
                      </h2>
                      <span className="text-[9px] font-bold tracking-wider text-teal-700 uppercase block mt-0.5">
                        PRINCIPAL DESK
                      </span>
                    </div>
                  </div>

                  {/* Collapse button */}
                  <button
                    type="button"
                    onClick={() => handleToggleCollapse(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 w-full">
                  <button
                    type="button"
                    onClick={() => handleToggleCollapse(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition cursor-pointer"
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Nav Items List */}
            <div className={`py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
              {/* Category Label (only when expanded) */}
              {!isCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Core Management
                </div>
              )}

              {navItems.map((item) => {
                const Icon = item.icon;
                const activeClass = item.isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium transition-colors';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center rounded-xl text-xs transition-all group ${
                      isCollapsed
                        ? 'justify-center p-2.5'
                        : 'gap-3 px-3.5 py-2.5'
                    } ${activeClass}`}
                  >
                    <Icon
                      size={18}
                      className={`shrink-0 ${
                        item.isActive
                          ? 'text-slate-900'
                          : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Institutional Code & Faculty Link */}
          <div className={`p-3 border-t border-slate-200 bg-slate-50/60 space-y-2`}>
            {/* When Expanded: Full institutional Code Box */}
            {!isCollapsed ? (
              <>
                <div className="rounded-xl p-2.5 border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                    <span>Institutional Code</span>
                    <button
                      onClick={handleCopyCode}
                      className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title="Copy School Code"
                    >
                      {copied ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900 flex items-center justify-between">
                    <span>{schoolCode || '100001'}</span>
                    <span className="text-[9px] font-normal text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>

                <Link
                  href="/faculty"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Faculty Hub View</span>
                  </span>
                  <ExternalLink size={12} className="text-slate-400" />
                </Link>
              </>
            ) : (
              /* When Collapsed: Compact Centered Icons */
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                  title={`School Code: ${schoolCode} (Click to copy)`}
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Building2 size={16} />
                  )}
                </button>

                <Link
                  href="/faculty"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-2xs"
                  title="Switch to Faculty Hub View"
                >
                  <ShieldCheck size={16} className="text-emerald-600" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE DRAWER OVERLAY                                                  */}
      {/* ========================================================================= */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col border-r border-slate-200 text-slate-600">
            {/* Mobile Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                    {schoolName || 'Apex Academy'}
                  </h2>
                  <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase block mt-1">
                    PRINCIPAL&apos;S DASHBOARD
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Nav Items */}
            <div className="px-3 py-6 space-y-1.5 flex-1 overflow-y-auto">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Core Management
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const activeClass = item.isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium transition-colors';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all group ${activeClass}`}
                  >
                    <Icon
                      size={18}
                      className={
                        item.isActive
                          ? 'text-slate-900'
                          : 'text-slate-400 group-hover:text-slate-700'
                      }
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="rounded-xl p-3 border border-slate-200 bg-white shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Institutional Code
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-slate-400 hover:text-slate-700 transition"
                    title="Copy School Code"
                  >
                    {copied ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
                <div className="text-sm font-mono font-bold text-slate-900 tracking-wider flex items-center justify-between">
                  <span>{schoolCode || '100001'}</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200">
                    Active Tenant
                  </span>
                </div>
              </div>

              <Link
                href="/faculty"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs transition"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Faculty Hub View</span>
                </span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
