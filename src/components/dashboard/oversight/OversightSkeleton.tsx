import React from 'react';

export default function OversightSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 bg-slate-200 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2"
          >
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
            <div className="h-2 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="h-9 w-64 bg-slate-100 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-slate-100 rounded-xl" />
          <div className="h-8 w-20 bg-slate-100 rounded-xl" />
          <div className="h-8 w-20 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Allocation Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-5 w-40 bg-slate-200 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-3 w-10 bg-slate-100 rounded" />
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full" />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-8 w-24 bg-slate-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
