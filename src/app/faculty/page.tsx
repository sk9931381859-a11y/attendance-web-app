import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/dashboard/DashboardNav';
import FacultyDashboard from '@/components/faculty/FacultyDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Faculty Hub & Syllabus Tracker | Attendance Hub',
  description: 'Teacher portal for syllabus milestone tracking, weekly timetable, leave portal, and notice board.',
};

export default async function FacultyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let staffName = 'Faculty Member';
  let staffEmail: string | undefined = undefined;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.name) staffName = profile.name;
    if (profile?.email) staffEmail = profile.email;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardNav adminName={staffName} adminEmail={staffEmail} />
      <main className="flex-1 max-w-7xl w-full mx-auto">
        <FacultyDashboard />
      </main>
    </div>
  );
}
