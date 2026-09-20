import React from 'react';
import SyllabusSkeleton from '@/components/faculty/syllabus/SyllabusSkeleton';

export default function FacultySyllabusLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="h-16 border-b border-gray-200 bg-white" />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <SyllabusSkeleton />
      </main>
    </div>
  );
}
