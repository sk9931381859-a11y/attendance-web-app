import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
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

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6">
      <AcademicOversight />
    </div>
  );
}
