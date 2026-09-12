import React from 'react';
import { Metadata } from 'next';
import { getStaffListAction, getAttendanceLogsAction } from '@/app/actions/staff';
import StaffManagementScreen from '@/components/dashboard/StaffManagementScreen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff & Attendance Management | Principal Dashboard',
  description: 'Register staff with Supabase Auth, manage working shifts, and audit historical attendance records.',
};

export default async function ManageStaffPage() {
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
