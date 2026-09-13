import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffListAction, getAttendanceLogsAction } from '@/app/dashboard/manage/actions';
import StaffManagementScreen from '@/components/dashboard/StaffManagementScreen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff Directory & Audit Logs | Principal Dashboard',
  description: 'Register staff with Supabase Auth, manage faculty shifts, and audit historical attendance records.',
};

export default async function ManageStaffPage() {
  // 1. Server-Side Authentication Guard (Security)
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  // 2. Fetch initial staff roster and default 3-month attendance audit logs
  const [staffList, logsResult] = await Promise.all([
    getStaffListAction(),
    getAttendanceLogsAction(),
  ]);

  return (
    <StaffManagementScreen
      initialStaff={staffList}
      initialLogs={logsResult.logs || []}
    />
  );
}
