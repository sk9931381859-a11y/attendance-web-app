import React from 'react';

export default function AcademicsSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-slate-200 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
          <div className="h-9 w-32 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Classes & Subjects Skeleton (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Class selector bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
            <div className="flex gap-2 overflow-x-hidden pt-1">
              <div className="h-9 w-24 bg-slate-200 rounded-xl flex-shrink-0" />
              <div className="h-9 w-24 bg-slate-200 rounded-xl flex-shrink-0" />
              <div className="h-9 w-24 bg-slate-200 rounded-xl flex-shrink-0" />
            </div>
          </div>

          {/* Subjects Card List */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-7 w-24 bg-slate-200 rounded-lg" />
            </div>

            {/* Repeat 3 subject item skeletons */}
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-36 bg-slate-200 rounded" />
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="h-4 w-44 bg-slate-200 rounded" />
                  <div className="h-7 w-24 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Syllabus Builder Skeleton (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Syllabus Header & Quick Stats */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="h-5 w-48 bg-slate-200 rounded" />
                <div className="h-3.5 w-64 bg-slate-200 rounded" />
              </div>
              <div className="h-8 w-28 bg-slate-200 rounded-xl" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          </div>

          {/* Add Chapter Form Skeleton */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-7 h-10 bg-slate-200 rounded-xl" />
              <div className="sm:col-span-3 h-10 bg-slate-200 rounded-xl" />
              <div className="sm:col-span-2 h-10 bg-slate-200 rounded-xl" />
            </div>
          </div>

          {/* Term Chapters Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-5 w-8 bg-slate-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-5 w-8 bg-slate-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
