import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/dashboard/DashboardNav';

export const dynamic = 'force-dynamic';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Route Guard & Persistent Layout for /dashboard routes:
 * 1. Checks active user session via Supabase Auth.
 * 2. Verifies that the authenticated profile has role === 'admin'.
 * 3. Redirects unauthenticated or unauthorized users to /login.
 * 4. Renders the persistent navigation header bridging /dashboard and /dashboard/manage.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = createClient();

  // 1. Session verification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Role verification (must be 'admin')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Persistent Navigation Header */}
      <DashboardNav
        adminName={profile.name || 'School Principal'}
        adminEmail={profile.email || user.email}
      />

      {/* Child Route Content (/dashboard or /dashboard/manage) */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
