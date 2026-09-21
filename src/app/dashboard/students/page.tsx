import React from 'react';
import { Metadata } from 'next';
import StudentDirectoryClient from '@/components/students/StudentDirectoryClient';
import { fetchClasses } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Student Directory | Attendance Hub',
  description: 'Manage student enrollments, roll numbers, and parent WhatsApp communication channels.',
};

export default async function StudentsPage() {
  const { data: initialClasses } = await fetchClasses();

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6">
      <StudentDirectoryClient initialClasses={initialClasses || []} />
    </div>
  );
}
