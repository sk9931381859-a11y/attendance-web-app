'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Check,
  X,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
  Calendar,
  Lock,
  User,
  Building2,
  CalendarDays,
  Bell,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  SchoolAcademicProgressData,
  AllocationProgressSummary,
  ChapterProgressDetail,
  PaceStatus,
} from '@/app/dashboard/oversight/actions';
import AcademicOversightLegacyDesk from '@/components/dashboard/AcademicOversight';

interface AcademicOversightClientProps {
  initialData: SchoolAcademicProgressData;
}

export default function AcademicOversightClient({ initialData }: AcademicOversightClientProps) {
  // Navigation tabs between Phase 3 Syllabus Oversight & Legacy Desk (Leave/Notices)
  const [activeTab, setActiveTab] = useState<'syllabus' | 'leaves_notices'>('syllabus');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaceStatus>('all');

  // Slide-out Drawer state
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationProgressSummary | null>(null);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAllocation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter allocations based on search text and status
  const filteredAllocations = useMemo(() => {
    return initialData.allocations.filter((alloc) => {
      // Status filter
      if (statusFilter !== 'all' && alloc.status !== statusFilter) {
        return false;
      }

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        alloc.teacher_name.toLowerCase().includes(q) ||
        alloc.subject_name.toLowerCase().includes(q) ||
        alloc.class_name.toLowerCase().includes(q)
      );
    });
  }, [initialData.allocations, statusFilter, searchQuery]);

  const stats = initialData.stats;

  // Format date helper with fallback
  const formatTimestamp = (isoDate: string | null) => {
    if (!isoDate) return null;
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
              <GraduationCap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Principal&apos;s Academic Oversight
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  40/40/20 ANALYTICS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {initialData.schoolName} &bull; Monitor teacher curriculum pacing and milestone execution
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('syllabus')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'syllabus'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={14} className={activeTab === 'syllabus' ? 'text-teal-600' : 'text-slate-400'} />
            <span>Syllabus Pacing (40/40/20)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves_notices')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'leaves_notices'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays size={14} className={activeTab === 'leaves_notices' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Faculty Leaves &amp; Notices</span>
          </button>
        </div>
      </div>

      {/* Conditionally Render Legacy Desk if second tab is selected */}
      {activeTab === 'leaves_notices' ? (
        <AcademicOversightLegacyDesk />
      ) : (
        <>
          {/* 2. KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Allocations */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Active Allocations</span>
                <Layers className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                  {stats.totalAllocations}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  across {stats.totalChapters} chapters
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                {stats.totalTeachers} Faculty Members Assigned
              </div>
            </div>

            {/* Average Completion */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Average Syllabus Pacing</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                  {stats.averageCompletion}%
                </span>
                <span className="text-xs text-slate-400 font-medium">overall weighted</span>
              </div>
              <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-linear-to-r from-teal-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${stats.averageCompletion}%` }}
                />
              </div>
            </div>

            {/* Lagging Allocations (< 25%) */}
            <div className="bg-white border border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-xs bg-rose-50/20">
              <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
                <span>Lagging Pacing</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-700">
                  {stats.laggingCount}
                </span>
                <span className="text-xs text-rose-600/80 font-medium">subjects (&lt; 25%)</span>
              </div>
              <div className="mt-2 text-[11px] text-rose-600 font-medium">
                Immediate oversight required
              </div>
            </div>

            {/* On Track & Nearing Completion */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Healthy Progress</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <div>
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-600">
                    {stats.onTrackCount}
                  </span>
                  <span className="text-[10px] text-amber-700 block font-semibold">On Track</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
                    {stats.nearingCompletionCount}
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">&gt; 75% Done</span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                Pacing according to curriculum schedule
              </div>
            </div>
          </div>

          {/* 3. Search and Filtering Controls */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Live Search */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teacher, class (e.g. Class 10), or subject..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({initialData.allocations.length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('lagging')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === 'lagging'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Lagging ({stats.laggingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('on_track')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === 'on_track'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>On Track ({stats.onTrackCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('nearing_completion')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === 'nearing_completion'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Nearing Done ({stats.nearingCompletionCount})</span>
              </button>
            </div>
          </div>

          {/* 4. High-Level Allocation Grid */}
          {filteredAllocations.length === 0 ? (
            <div className="py-16 px-4 bg-white rounded-3xl border border-slate-200/80 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <BookOpen size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No matching teacher allocations found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try clearing your search filters or status criteria to see all allocations.'
                  : 'No teaching allocations have been configured for this school yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAllocations.map((alloc) => {
                // Status styles
                const isLagging = alloc.status === 'lagging';
                const isOnTrack = alloc.status === 'on_track';
                const isNearing = alloc.status === 'nearing_completion';

                const badgeClass = isLagging
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isOnTrack
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                const progressBgClass = isLagging
                  ? 'bg-rose-500'
                  : isOnTrack
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

                return (
                  <div
                    key={alloc.id}
                    onClick={() => setSelectedAllocation(alloc)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between space-y-4 cursor-pointer group select-none"
                  >
                    <div>
                      {/* Top: Class Badge + Status Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {alloc.class_name}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLagging
                                ? 'bg-rose-500'
                                : isOnTrack
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>{alloc.statusLabel}</span>
                        </span>
                      </div>

                      {/* Subject Name */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-teal-700 transition-colors">
                        {alloc.class_name} &bull; {alloc.subject_name}
                      </h2>

                      {/* Teacher Profile */}
                      <div className="flex items-center gap-2.5 mt-2.5 pt-2.5 border-t border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {alloc.teacher_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {alloc.teacher_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {alloc.teacher_email || 'Assigned Faculty'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 text-[11px] font-medium">
                          40/40/20 Completion
                        </span>
                        <span className="text-slate-900 font-mono text-sm">
                          {alloc.progressPercent}%
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
                          style={{ width: `${alloc.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>
                          {alloc.totalChapters} Chapters ({alloc.completedChapters} Complete)
                        </span>
                        <span className="text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Inspect</span>
                          <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Granular Drill-Down Slide-Out Drawer / Modal */}
          {selectedAllocation && (
            <div className="fixed inset-0 z-50 flex">
              {/* Dimmed Backdrop */}
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={() => setSelectedAllocation(null)}
              />

              {/* Slide-out Panel */}
              <div className="relative ml-auto w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
                {/* Drawer Header */}
                <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 text-slate-800 font-mono">
                        {selectedAllocation.class_name}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                        Curriculum Inspection
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                      {selectedAllocation.class_name} &bull; {selectedAllocation.subject_name}
                    </h2>

                    <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5">
                      <User size={13} className="text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {selectedAllocation.teacher_name}
                      </span>
                      {selectedAllocation.teacher_email && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({selectedAllocation.teacher_email})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAllocation(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 transition"
                    aria-label="Close details"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Progress Banner */}
                <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {selectedAllocation.progressPercent}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          selectedAllocation.status === 'lagging'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : selectedAllocation.status === 'on_track'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {selectedAllocation.statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedAllocation.totalChapters} Total Chapters &bull; {selectedAllocation.completedChapters} Fully Completed
                    </p>
                  </div>

                  {/* Read-only Security Notice */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium self-start sm:self-auto">
                    <Lock size={12} className="text-slate-500" />
                    <span>Read-Only Oversight View</span>
                  </div>
                </div>

                {/* Drawer Chapters List (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/40">
                  {selectedAllocation.allChapters.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No chapters defined for this subject yet.
                    </div>
                  ) : (
                    <>
                      {/* Term 1 Chapters */}
                      {selectedAllocation.term1Chapters.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Term 1 Chapters
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              {selectedAllocation.term1Chapters.length} Chapters
                            </span>
                          </div>

                          <div className="space-y-3">
                            {selectedAllocation.term1Chapters.map((cd, idx) => (
                              <ReadOnlyChapterCard
                                key={cd.chapter.id}
                                detail={cd}
                                index={idx + 1}
                                formatTimestamp={formatTimestamp}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Term 2 Chapters */}
                      {selectedAllocation.term2Chapters.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Term 2 Chapters
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {selectedAllocation.term2Chapters.length} Chapters
                            </span>
                          </div>

                          <div className="space-y-3">
                            {selectedAllocation.term2Chapters.map((cd, idx) => (
                              <ReadOnlyChapterCard
                                key={cd.chapter.id}
                                detail={cd}
                                index={selectedAllocation.term1Chapters.length + idx + 1}
                                formatTimestamp={formatTimestamp}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional / Other Chapters */}
                      {selectedAllocation.otherChapters.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Additional Chapters
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {selectedAllocation.otherChapters.length} Chapters
                            </span>
                          </div>

                          <div className="space-y-3">
                            {selectedAllocation.otherChapters.map((cd, idx) => (
                              <ReadOnlyChapterCard
                                key={cd.chapter.id}
                                detail={cd}
                                index={
                                  selectedAllocation.term1Chapters.length +
                                  selectedAllocation.term2Chapters.length +
                                  idx +
                                  1
                                }
                                formatTimestamp={formatTimestamp}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAllocation(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Close Inspection
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Read-Only Chapter Card displaying the disabled 40/40/20 milestones
 * with exact completion timestamps directly beneath ticked items.
 */
interface ReadOnlyChapterCardProps {
  detail: ChapterProgressDetail;
  index: number;
  formatTimestamp: (isoDate: string | null) => string | null;
}

function ReadOnlyChapterCard({
  detail,
  index,
  formatTimestamp,
}: ReadOnlyChapterCardProps) {
  const hasExplained = Boolean(detail.explained_at);
  const hasExercise = Boolean(detail.exercise_discussed_at);
  const hasCopyChecked = Boolean(detail.copy_checked_at);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
      {/* Chapter Title & Overall Completion */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold font-mono flex items-center justify-center shrink-0">
            {index}
          </span>
          <span className="text-sm font-bold text-slate-900 truncate">
            {detail.chapter.name}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
            detail.chapterScore === 100
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : detail.chapterScore > 0
              ? 'bg-teal-50 text-teal-700 border border-teal-200'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {detail.chapterScore}%
        </span>
      </div>

      {/* 3 Read-only 40/40/20 Milestone Badges with Timestamps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* 1. Explained (40%) */}
        <div
          className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
            hasExplained
              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
              : 'bg-slate-50/70 border-slate-200 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                  hasExplained
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-slate-300 text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span>Explained (40%)</span>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-medium">
            {hasExplained ? (
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <Clock size={10} />
                <span>{formatTimestamp(detail.explained_at)}</span>
              </span>
            ) : (
              <span className="text-slate-400">Not Completed</span>
            )}
          </div>
        </div>

        {/* 2. Exercise Discussed (40%) */}
        <div
          className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
            hasExercise
              ? 'bg-purple-50/70 border-purple-200 text-purple-900'
              : 'bg-slate-50/70 border-slate-200 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                  hasExercise
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white border-slate-300 text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span>Exercise (40%)</span>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-medium">
            {hasExercise ? (
              <span className="text-purple-700 font-semibold flex items-center gap-1">
                <Clock size={10} />
                <span>{formatTimestamp(detail.exercise_discussed_at)}</span>
              </span>
            ) : (
              <span className="text-slate-400">Not Completed</span>
            )}
          </div>
        </div>

        {/* 3. Copies Checked (20%) */}
        <div
          className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
            hasCopyChecked
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-50/70 border-slate-200 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                  hasCopyChecked
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white border-slate-300 text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span>Copy Checked (20%)</span>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-medium">
            {hasCopyChecked ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Clock size={10} />
                <span>{formatTimestamp(detail.copy_checked_at)}</span>
              </span>
            ) : (
              <span className="text-slate-400">Not Completed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
