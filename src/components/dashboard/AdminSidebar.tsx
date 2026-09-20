'use client';

import React from 'react';
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
} from 'lucide-react';

interface AdminSidebarProps {
  schoolName?: string | null;
  schoolCode?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  schoolName = 'Apex Global Academy',
  schoolCode = '100001',
  isOpen = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [copied, setCopied] = React.useState(false);

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

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none">
      {/* 1. Header / Logo Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Building2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight leading-none">
                  {schoolName || 'Apex Academy'}
                </span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                PRINCIPAL&apos;S DASHBOARD
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 2. Navigation Items */}
        <div className="px-3 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Core Management
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const activeClass = item.isActive
              ? 'bg-emerald-600 text-white font-medium shadow-sm'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors';

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 group ${activeClass}`}
              >
                <Icon
                  size={18}
                  className={item.isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Footer / Tenant Metadata */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 space-y-3">
        {/* School Code Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Institutional Code
            </span>
            <button
              onClick={handleCopyCode}
              className="text-slate-400 hover:text-emerald-400 transition"
              title="Copy School Code"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
          <div className="text-sm font-mono font-bold text-white tracking-wider flex items-center justify-between">
            <span>{schoolCode || '100001'}</span>
            <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Active Tenant
            </span>
          </div>
        </div>

        {/* Link to Faculty View */}
        <Link
          href="/faculty"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 transition"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Faculty Hub View</span>
          </span>
          <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <aside className="relative w-64 max-w-[80vw] bg-slate-900 h-full shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
