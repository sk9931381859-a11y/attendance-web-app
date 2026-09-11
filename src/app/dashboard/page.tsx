import React from 'react';
import { Metadata } from 'next';
import PrincipalDashboard from '@/components/dashboard/PrincipalDashboard';
import { getTodayAttendanceSummaryAction } from '@/app/actions/dashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Principal's Dashboard | Attendance Web App",
  description: "Live real-time monitoring of today's attendance (Present, Late, Absent).",
};

export default async function DashboardPage() {
  const initialData = await getTodayAttendanceSummaryAction();

  return <PrincipalDashboard initialData={initialData} />;
}
