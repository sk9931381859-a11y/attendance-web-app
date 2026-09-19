import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PayrollDashboard from '@/components/payroll/PayrollDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payroll Management & LOP Locking | Attendance Hub',
  description: 'Dynamic Loss-of-Pay (LOP) calculation via Supabase RPC and permanent monthly payroll locking.',
};

export default async function PayrollPage() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6">
      <PayrollDashboard />
    </div>
  );
}
