import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/dashboard/Sidebar';
import AdminHeader from '@/components/dashboard/AdminHeader';

export const dynamic = 'force-dynamic';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Multi-Tenant Role-Based Layout for Admin Dashboard (/dashboard/*)
 * 1. Checks active user session via Supabase Auth.
 * 2. Reads role directly from Auth JWT (user.app_metadata.role) with profile fallback.
 * 3. Strictly enforces role boundaries:
 *    - Staff (Teachers) are immediately routed to /faculty.
 *    - Unauthenticated users are routed to /login.
 * 4. Renders the collapsible light-theme Sidebar and unified top header.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = createClient();

  // 1. Authenticate session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Read role and tenant from Auth JWT
  const jwtRole = (user.app_metadata as any)?.role;
  const jwtSchoolId = (user.app_metadata as any)?.school_id;

  // Fetch profile for fallback and display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  const effectiveRole = jwtRole || profile?.role || 'staff';
  const effectiveSchoolId = jwtSchoolId || profile?.school_id;

  // Strict role separation: Teachers must not access admin /dashboard pages
  if (effectiveRole !== 'admin') {
    redirect('/faculty');
  }

  // Fetch School Name and Code for institutional header branding
  let schoolName = 'Apex Global Academy';
  let schoolCode = '100001';
  if (effectiveSchoolId) {
    const { data: school } = await supabase
      .from('schools')
      .select('name, school_code')
      .eq('id', effectiveSchoolId)
      .maybeSingle();
    if (school?.name) {
      schoolName = school.name;
    }
    if (school?.school_code) {
      schoolCode = school.school_code;
    }
  }

  const adminDisplayName = profile?.name || user.email?.split('@')[0] || 'School Principal';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* 1. Collapsible Light-Themed Sidebar */}
      <Sidebar
        schoolName={schoolName}
        schoolCode={schoolCode}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <AdminHeader
          adminName={adminDisplayName}
          adminEmail={user.email}
          schoolName={schoolName}
        />

        <main className="flex-1 w-full bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
