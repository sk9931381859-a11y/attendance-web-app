'use client';

import React from 'react';
import Sidebar from './Sidebar';
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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* 1. Collapsible Light-Themed Vertical Sidebar */}
      <Sidebar
        schoolName={schoolName}
        schoolCode={schoolCode}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <AdminHeader
          adminName={adminName}
          adminEmail={adminEmail}
          schoolName={schoolName}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 w-full bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

