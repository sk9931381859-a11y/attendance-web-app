import React from 'react';

export default function StudentsLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-3.5 w-72 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-12 bg-slate-200 rounded" />
          <div className="h-10 w-60 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-10 w-64 bg-slate-100 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="h-7 w-12 bg-slate-200 rounded-lg" />
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-32 bg-slate-100 rounded-md" />
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
