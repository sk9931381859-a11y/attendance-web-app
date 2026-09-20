'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  School,
  Check,
  Loader2,
  Calendar,
  Layers,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import {
  AllocationWithSyllabus,
  updateChapterProgress,
  ProgressField,
} from '@/app/faculty/syllabus/actions';
import { ChapterProgress } from '@/types/supabase';

interface SyllabusClientProps {
  allocations: AllocationWithSyllabus[];
  initialProgressMap: Record<string, Partial<ChapterProgress>>;
}

export default function SyllabusClient({
  allocations,
  initialProgressMap,
}: SyllabusClientProps) {
  // Local state for optimistic chapter progress tracking
  const [progressMap, setProgressMap] = useState<
    Record<string, Partial<ChapterProgress>>
  >(initialProgressMap);

  // Expanded subject cards state (by default, first subject expanded)
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (allocations.length > 0) {
      initial[allocations[0].id] = true;
    }
    return initial;
  });

  // Track pending toggle requests per chapter + field
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  const toggleSubjectExpanded = (allocationId: string) => {
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [allocationId]: !prev[allocationId],
    }));
  };

  /**
   * Optimistic Toggle Handler
   * Instantly reflects the change in the UI, then syncs with Supabase via Server Action.
   * If sync fails, reverts to previous state and fires error toast.
   */
  const handleToggle = async (
    allocationId: string,
    chapterId: string,
    field: ProgressField
  ) => {
    const toggleKey = `${chapterId}-${field}`;
    if (pendingToggles[toggleKey]) return; // prevent duplicate clicks

    // Determine current state
    const currentProgress = progressMap[chapterId] || {};
    const wasCompleted = Boolean(currentProgress[field]);
    const nextCompleted = !wasCompleted;

    // 1. Optimistic Update (Immediate UI response)
    const previousSnapshot = { ...currentProgress };
    setProgressMap((prev) => ({
      ...prev,
      [chapterId]: {
        ...prev[chapterId],
        [field]: nextCompleted ? new Date().toISOString() : null,
      },
    }));

    // Mark key as pending
    setPendingToggles((prev) => ({ ...prev, [toggleKey]: true }));

    try {
      const res = await updateChapterProgress(
        allocationId,
        chapterId,
        field,
        nextCompleted
      );

      if (!res.success) {
        throw new Error(res.error || 'Server error');
      }
    } catch (err: any) {
      console.error('Progress sync error:', err);
      // Revert optimistic update
      setProgressMap((prev) => ({
        ...prev,
        [chapterId]: previousSnapshot,
      }));
      toast.error('Failed to sync progress. Please check connection.');
    } finally {
      setPendingToggles((prev) => {
        const next = { ...prev };
        delete next[toggleKey];
        return next;
      });
    }
  };

  /**
   * 40/40/20 Percentage Calculation for a Subject Allocation
   */
  const calculateSubjectProgress = (chapters: AllocationWithSyllabus['chapters']) => {
    if (!chapters || chapters.length === 0) return 0;

    let earnedPoints = 0;
    const maxPoints = chapters.length * 100;

    for (const chap of chapters) {
      const prog = progressMap[chap.id];
      if (prog?.explained_at) earnedPoints += 40;
      if (prog?.exercise_discussed_at) earnedPoints += 40;
      if (prog?.copy_checked_at) earnedPoints += 20;
    }

    return Math.round((earnedPoints / maxPoints) * 100);
  };

  /**
   * Chapter individual completion percentage (0%, 20%, 40%, 60%, 80%, 100%)
   */
  const getChapterProgressPercent = (chapterId: string) => {
    const prog = progressMap[chapterId];
    let pts = 0;
    if (prog?.explained_at) pts += 40;
    if (prog?.exercise_discussed_at) pts += 40;
    if (prog?.copy_checked_at) pts += 20;
    return pts;
  };

  // 1. Empty State
  if (!allocations || allocations.length === 0) {
    return (
      <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          <BookOpen size={36} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">
          No Teaching Allocations Found
        </h3>
        <p className="text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
          No teaching allocations found for your profile. Please contact the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-600/10 text-teal-700 border border-teal-600/20">
              <BookOpen size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Teacher&apos;s Execution Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track syllabus pacing with the 40/40/20 milestone framework across your assigned classes.
          </p>
        </div>

        {/* Legend Pill */}
        <div className="hidden lg:flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-600 font-medium">Explained (40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <span className="text-slate-600 font-medium">Exercise (40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-slate-600 font-medium">Copy (20%)</span>
          </div>
        </div>
      </div>

      {/* 2. Subject Grid */}
      <div className="grid grid-cols-1 gap-6">
        {allocations.map((alloc) => {
          const isExpanded = Boolean(expandedSubjectIds[alloc.id]);
          const percent = calculateSubjectProgress(alloc.chapters);

          const term1Chapters = alloc.chapters.filter((c) => c.term === 'Term 1');
          const term2Chapters = alloc.chapters.filter((c) => c.term === 'Term 2');
          const otherChapters = alloc.chapters.filter(
            (c) => c.term !== 'Term 1' && c.term !== 'Term 2'
          );

          return (
            <div
              key={alloc.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
            >
              {/* Card Header / Summary (Click to Toggle) */}
              <div
                onClick={() => toggleSubjectExpanded(alloc.id)}
                className="p-5 sm:p-6 cursor-pointer select-none space-y-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {alloc.class_name}
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                        Assigned Subject
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{alloc.class_name} &bull; {alloc.subject_name}</span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Completion Badge */}
                    <div className="flex items-baseline gap-1 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200/80">
                      <span className="text-base sm:text-lg font-black text-slate-900">
                        {percent}%
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Completed
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      aria-label={isExpanded ? 'Collapse subject' : 'Expand subject'}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Visual Progress Bar (40/40/20 Weighted) */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-linear-to-r from-teal-500 to-emerald-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      {alloc.chapters.length} Total Chapters
                      {term1Chapters.length > 0 || term2Chapters.length > 0 || otherChapters.length > 0 ? (
                        <>
                          {' '}(
                          {[
                            term1Chapters.length > 0 ? `${term1Chapters.length} Term 1` : null,
                            term2Chapters.length > 0 ? `${term2Chapters.length} Term 2` : null,
                            otherChapters.length > 0 ? `${otherChapters.length} General` : null,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                          )
                        </>
                      ) : null}
                    </span>
                    <span>{percent === 100 ? '🎉 Curriculum Completed' : `${percent}% Done`}</span>
                  </div>
                </div>
              </div>

              {/* Accordion Content: Chapter List Divided by Term 1, Term 2, and General */}
              {isExpanded && (
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-6 bg-slate-50/30">
                  {alloc.chapters.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No chapters defined for this subject yet.
                    </div>
                  ) : (
                    <>
                      {/* Term 1 Section */}
                      {term1Chapters.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Term 1 Chapters
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              {term1Chapters.length} Chapters
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {term1Chapters.map((chap, idx) => (
                              <ChapterRow
                                key={chap.id}
                                chapter={chap}
                                index={idx + 1}
                                allocationId={alloc.id}
                                progress={progressMap[chap.id] || {}}
                                percent={getChapterProgressPercent(chap.id)}
                                pendingToggles={pendingToggles}
                                onToggle={(field) =>
                                  handleToggle(alloc.id, chap.id, field)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Term 2 Section */}
                      {term2Chapters.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Term 2 Chapters
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {term2Chapters.length} Chapters
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {term2Chapters.map((chap, idx) => (
                              <ChapterRow
                                key={chap.id}
                                chapter={chap}
                                index={term1Chapters.length + idx + 1}
                                allocationId={alloc.id}
                                progress={progressMap[chap.id] || {}}
                                percent={getChapterProgressPercent(chap.id)}
                                pendingToggles={pendingToggles}
                                onToggle={(field) =>
                                  handleToggle(alloc.id, chap.id, field)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other / General Chapters Section */}
                      {otherChapters.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Additional Chapters
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {otherChapters.length} Chapters
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {otherChapters.map((chap, idx) => (
                              <ChapterRow
                                key={chap.id}
                                chapter={chap}
                                index={term1Chapters.length + term2Chapters.length + idx + 1}
                                allocationId={alloc.id}
                                progress={progressMap[chap.id] || {}}
                                percent={getChapterProgressPercent(chap.id)}
                                pendingToggles={pendingToggles}
                                onToggle={(field) =>
                                  handleToggle(alloc.id, chap.id, field)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Individual Chapter Row Component with 40/40/20 Toggles
 */
interface ChapterRowProps {
  chapter: AllocationWithSyllabus['chapters'][0];
  index: number;
  allocationId: string;
  progress: Partial<ChapterProgress>;
  percent: number;
  pendingToggles: Record<string, boolean>;
  onToggle: (field: ProgressField) => void;
}

function ChapterRow({
  chapter,
  index,
  progress,
  percent,
  pendingToggles,
  onToggle,
}: ChapterRowProps) {
  const isExplained = Boolean(progress.explained_at);
  const isExercise = Boolean(progress.exercise_discussed_at);
  const isCopyChecked = Boolean(progress.copy_checked_at);

  const isExplainedPending = Boolean(pendingToggles[`${chapter.id}-explained_at`]);
  const isExercisePending = Boolean(pendingToggles[`${chapter.id}-exercise_discussed_at`]);
  const isCopyCheckedPending = Boolean(pendingToggles[`${chapter.id}-copy_checked_at`]);

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Chapter Information */}
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center font-mono flex-shrink-0">
            {index}
          </span>
          <span className="text-sm font-bold text-slate-900 truncate">
            {chapter.name}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              percent === 100
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : percent > 0
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {percent}%
          </span>
        </div>

        {/* Completion Subtitle / Timestamps if any */}
        <div className="text-[11px] text-slate-400 flex items-center gap-2 pl-7">
          {progress.copy_checked_at ? (
            <span className="text-emerald-600 font-medium">Fully Completed</span>
          ) : progress.explained_at ? (
            <span className="text-teal-600 font-medium">In Progress</span>
          ) : (
            <span>Not Started</span>
          )}
        </div>
      </div>

      {/* The 40/40/20 Trackers Button Group */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pl-7 md:pl-0">
        {/* 1. Explained (40%) - Blue Accent */}
        <button
          type="button"
          onClick={() => onToggle('explained_at')}
          disabled={isExplainedPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 disabled:opacity-60 cursor-pointer ${
            isExplained
              ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
              : 'bg-blue-50/80 text-blue-700 border border-blue-200/80 hover:bg-blue-100'
          }`}
          title="Mark Chapter Theory Explained (40% Weight)"
        >
          {isExplainedPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isExplained ? (
            <Check size={13} strokeWidth={2.5} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
          <span>Explained 40%</span>
        </button>

        {/* 2. Exercise (40%) - Purple Accent */}
        <button
          type="button"
          onClick={() => onToggle('exercise_discussed_at')}
          disabled={isExercisePending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 disabled:opacity-60 cursor-pointer ${
            isExercise
              ? 'bg-purple-600 text-white shadow-xs hover:bg-purple-700'
              : 'bg-purple-50/80 text-purple-700 border border-purple-200/80 hover:bg-purple-100'
          }`}
          title="Mark Exercises & Q/A Discussed (40% Weight)"
        >
          {isExercisePending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isExercise ? (
            <Check size={13} strokeWidth={2.5} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          )}
          <span>Exercise 40%</span>
        </button>

        {/* 3. Copy Checked (20%) - Green Accent */}
        <button
          type="button"
          onClick={() => onToggle('copy_checked_at')}
          disabled={isCopyCheckedPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 disabled:opacity-60 cursor-pointer ${
            isCopyChecked
              ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
              : 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
          }`}
          title="Mark Student Notebooks Checked (20% Weight)"
        >
          {isCopyCheckedPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isCopyChecked ? (
            <Check size={13} strokeWidth={2.5} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
          <span>Copy 20%</span>
        </button>
      </div>
    </div>
  );
}
