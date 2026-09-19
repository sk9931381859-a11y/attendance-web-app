import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TeacherNav from '@/components/dashboard/TeacherNav';
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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  let staffName = user.email?.split('@')[0] || 'Faculty Member';
  let staffEmail: string | undefined = user.email;
  let schoolName = 'Apex Global Academy';

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.name) staffName = profile.name;
  if (profile?.email) staffEmail = profile.email;

  const schoolId = profile?.school_id || (user.app_metadata as any)?.school_id;
  if (schoolId) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .maybeSingle();
    if (school?.name) {
      schoolName = school.name;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <TeacherNav
        teacherName={staffName}
        teacherEmail={staffEmail}
        schoolName={schoolName}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <FacultyDashboard />
      </main>
    </div>
  );
}
