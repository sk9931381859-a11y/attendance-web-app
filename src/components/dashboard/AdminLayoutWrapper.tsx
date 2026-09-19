'use client';

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  adminName: string;
  adminEmail?: string | null;
  schoolName?: string | null;
  schoolCode?: string | null;
}

export default function AdminLayoutWrapper({
  children,
  adminName,
  adminEmail,
  schoolName,
  schoolCode,
}: AdminLayoutWrapperProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* 1. Fixed Left-hand Vertical Sidebar (Width: 64, Background: bg-slate-900) */}
      <AdminSidebar
        schoolName={schoolName}
        schoolCode={schoolCode}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Wrapper: Offset by w-64 on desktop */}
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen w-full">
        {/* Top Header: Clean white bar (h-16, border-b) with Kiosk button & profile dropdown */}
        <AdminHeader
          adminName={adminName}
          adminEmail={adminEmail}
          schoolName={schoolName}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 w-full bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
