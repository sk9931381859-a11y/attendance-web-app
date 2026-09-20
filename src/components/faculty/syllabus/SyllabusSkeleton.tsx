import React from 'react';

export default function SyllabusSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-slate-200 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Grid of Subject Cards Skeleton */}
      <div className="grid grid-cols-1 gap-6">
        {[1, 2].map((card) => (
          <div
            key={card}
            className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5"
          >
            {/* Top Bar with Title and Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-200 rounded-md" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
              </div>
              <div className="h-8 w-20 bg-slate-200 rounded-xl" />
            </div>

            {/* Horizontal Progress Bar Skeleton */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-slate-200 rounded-full" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
            </div>

            {/* Chapter Rows Skeleton */}
            <div className="pt-2 space-y-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="h-5 w-40 bg-slate-200 rounded" />
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-28 bg-slate-200 rounded-xl" />
                    <div className="h-8 w-28 bg-slate-200 rounded-xl" />
                    <div className="h-8 w-28 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
