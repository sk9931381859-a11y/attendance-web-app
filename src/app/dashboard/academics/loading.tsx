import React from 'react';
import AcademicsSkeleton from '@/components/academics/AcademicsSkeleton';

export default function AcademicsLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6">
      <AcademicsSkeleton />
    </div>
  );
}
