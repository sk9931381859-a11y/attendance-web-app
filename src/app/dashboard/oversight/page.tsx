import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchSchoolAcademicProgress } from './actions';
import AcademicOversightClient from '@/components/dashboard/oversight/AcademicOversightClient';
import OversightSkeleton from '@/components/dashboard/oversight/OversightSkeleton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Academic & Syllabus Oversight | Principal's Dashboard",
  description: 'Principal desk for 40/40/20 curriculum pacing monitoring, pacing indicators, and chapter drill-downs.',
};

async function OversightDataContent() {
  const data = await fetchSchoolAcademicProgress();
  return <AcademicOversightClient initialData={data} />;
}

export default async function AcademicOversightPage() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<OversightSkeleton />}>
        <OversightDataContent />
      </Suspense>
    </div>
  );
}
