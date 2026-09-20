import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TeacherNav from '@/components/dashboard/TeacherNav';
import SyllabusClient from '@/components/faculty/syllabus/SyllabusClient';
import SyllabusSkeleton from '@/components/faculty/syllabus/SyllabusSkeleton';
import { getTeacherSyllabusData } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Syllabus Tracker | Faculty Portal',
  description: 'Teacher Execution Hub for 40/40/20 curriculum milestone progression.',
};

async function SyllabusContent() {
  const data = await getTeacherSyllabusData();

  return (
    <SyllabusClient
      allocations={data.allocations}
      initialProgressMap={data.progressMap}
    />
  );
}

export default async function FacultySyllabusPage() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get teacher details for navbar
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
    if (school?.name) schoolName = school.name;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <TeacherNav
        teacherName={staffName}
        teacherEmail={staffEmail}
        schoolName={schoolName}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <Suspense fallback={<SyllabusSkeleton />}>
          <SyllabusContent />
        </Suspense>
      </main>
    </div>
  );
}
