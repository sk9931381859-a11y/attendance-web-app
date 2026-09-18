import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/dashboard/DashboardNav';
import AcademicOversight from '@/components/dashboard/AcademicOversight';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Academic & Faculty Oversight | Attendance Hub',
  description: 'Principal desk for leave authorization, syllabus deviation monitoring, and notice broadcasting.',
};

export default async function AcademicOversightPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let adminName = 'School Principal';
  let adminEmail: string | undefined = 'admin@attendance.app';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.name) adminName = profile.name;
    if (profile?.email) adminEmail = profile.email;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardNav adminName={adminName} adminEmail={adminEmail} />
      <main className="flex-1 max-w-7xl w-full mx-auto">
        <AcademicOversight />
      </main>
    </div>
  );
}
