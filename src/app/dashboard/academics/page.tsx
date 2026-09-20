import React from 'react';
import { Metadata } from 'next';
import AcademicsMasterClient from '@/components/academics/AcademicsMasterClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Academics & Syllabus Master | Attendance Hub',
  description: 'Top-down Master-Allocation syllabus builder and teacher allocation desk.',
};

export default function AcademicsPage() {
  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6">
      <AcademicsMasterClient />
    </div>
  );
}
