import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/dashboard/DashboardNav';

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
 * 4. Renders the Unified Admin Navbar centrally to prevent layout/nav bleed across subpages.
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

  // Fetch School Name for institutional header branding
  let schoolName = 'Apex Global Academy';
  if (effectiveSchoolId) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', effectiveSchoolId)
      .maybeSingle();
    if (school?.name) {
      schoolName = school.name;
    }
  }

  const adminDisplayName = profile?.name || user.email?.split('@')[0] || 'School Principal';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Central Admin Navbar rendered ONCE here, eliminating all subpage duplication and bleed */}
      <DashboardNav
        adminName={adminDisplayName}
        adminEmail={user.email}
        schoolName={schoolName}
        role="admin"
      />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
