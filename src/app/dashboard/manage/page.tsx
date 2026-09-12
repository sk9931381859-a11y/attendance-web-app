import React from 'react';
import { Metadata } from 'next';
import { getStaffListAction } from '@/app/actions/staff';
import StaffManagementScreen from '@/components/dashboard/StaffManagementScreen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff Management | Principal Dashboard',
  description: 'Manage teachers, schedule shift start times, and configure role-based access.',
};

export default async function ManageStaffPage() {
  const staffList = await getStaffListAction();

  return <StaffManagementScreen initialStaff={staffList} />;
}
