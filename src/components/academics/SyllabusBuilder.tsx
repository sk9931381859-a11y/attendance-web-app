'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Loader2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { AcademicClass, AcademicSubject, Chapter, TeacherAllocation, Profile } from '@/types/supabase';

interface SyllabusBuilderProps {
  activeClass: AcademicClass | null;
  activeSubject: AcademicSubject | null;
  chapters: Chapter[];
  allocations: TeacherAllocation[];
  teachers: Profile[];
  onAddChapter: (subjectId: string, name: string, term: 'Term 1' | 'Term 2') => Promise<boolean>;
  onDeleteChapter: (chapterId: string, chapterName: string) => Promise<boolean>;
  onOpenAllocationModal: (subject: AcademicSubject) => void;
}

export default function SyllabusBuilder({
  activeClass,
  activeSubject,
  chapters,
  allocations,
  teachers,
  onAddChapter,
  onDeleteChapter,
  onOpenAllocationModal,
}: SyllabusBuilderProps) {
  const [chapterName, setChapterName] = useState('');
  const [term, setTerm] = useState<'Term 1' | 'Term 2'>('Term 1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  // Chapters belonging to this subject
  const subjectChapters = useMemo(() => {
    if (!activeSubject) return [];
    return chapters
      .filter((c) => c.subject_id === activeSubject.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [chapters, activeSubject]);

  const term1Chapters = useMemo(
    () => subjectChapters.filter((c) => c.term === 'Term 1'),
    [subjectChapters]
  );
  const term2Chapters = useMemo(
    () => subjectChapters.filter((c) => c.term === 'Term 2'),
    [subjectChapters]
  );

  // Assigned teacher profile
  const allocation = activeSubject
    ? allocations.find((a) => a.subject_id === activeSubject.id)
    : null;
  const teacherProfile = allocation
    ? teachers.find((t) => t.id === allocation.teacher_id || t.id === allocation.staff_id)
    : null;

  const handleSubmitChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !chapterName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onAddChapter(activeSubject.id, chapterName.trim(), term);
    setIsSubmitting(false);

    if (success) {
      setChapterName('');
    }
  };

  const handleDeleteChapter = async (chap: Chapter) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete chapter "${chap.name}"?\n\nThis will remove any recorded progress tracking for this chapter.`
    );
    if (!confirmed) return;

    setDeletingChapterId(chap.id);
    await onDeleteChapter(chap.id, chap.name);
    setDeletingChapterId(null);
  };

  // If no subject is chosen
  if (!activeSubject) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-10 text-center space-y-4 min-h-[460px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          <BookOpen size={32} />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-bold text-slate-800">
            No Subject Selected
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select a subject from the left panel to view and curate its syllabus, or add new chapters categorized into Term 1 and Term 2.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Header & Quick Statistics Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {activeClass?.name || 'Class'}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-semibold text-emerald-600">Syllabus Master</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{activeSubject.name}</span>
            </h2>
          </div>

          {/* Assigned Faculty Banner */}
          <div className="flex items-center gap-2">
            {teacherProfile ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="font-semibold text-emerald-900 truncate">
                  {teacherProfile.name}
                </span>
                <button
                  onClick={() => onOpenAllocationModal(activeSubject)}
                  className="text-[10px] text-emerald-700 underline font-medium hover:text-emerald-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAllocationModal(activeSubject)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition"
              >
                <UserCheck size={13} />
                <span>Allocate Teacher</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <Layers size={13} />
              <span>Total Chapters</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {subjectChapters.length}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-1.5 text-indigo-700 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <Calendar size={13} />
              <span>Term 1</span>
            </div>
            <div className="text-2xl font-bold text-indigo-900">
              {term1Chapters.length}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <CheckCircle2 size={13} />
              <span>Term 2</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              {term2Chapters.length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Add Chapter Form Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles size={14} className="text-emerald-600" />
          <span>Add Chapter to Syllabus</span>
        </h3>

        <form onSubmit={handleSubmitChapter} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Chapter Name Input (sm:col-span-7) */}
            <div className="sm:col-span-7">
              <input
                type="text"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="e.g. Compound Interest, Logarithms, Cell Biology..."
                disabled={isSubmitting}
                required
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 disabled:opacity-60 transition"
              />
            </div>

            {/* Term Selection Radio / Pills (sm:col-span-3) */}
            <div className="sm:col-span-3 flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTerm('Term 1')}
                disabled={isSubmitting}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  term === 'Term 1'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Term 1
              </button>
              <button
                type="button"
                onClick={() => setTerm('Term 2')}
                disabled={isSubmitting}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  term === 'Term 2'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Term 2
              </button>
            </div>

            {/* Submit Button (sm:col-span-2) */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!chapterName.trim() || isSubmitting}
                className="w-full h-full min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Term 1 & Term 2 Split Chapter List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Term 1 Column */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Term 1 Syllabus</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {term1Chapters.length} {term1Chapters.length === 1 ? 'Chapter' : 'Chapters'}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            {term1Chapters.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <FileText size={22} className="mx-auto text-slate-300" />
                <p>No Term 1 chapters added yet</p>
              </div>
            ) : (
              term1Chapters.map((chap, idx) => {
                const isDeleting = deletingChapterId === chap.id;
                return (
                  <div
                    key={chap.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100/70 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {chap.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteChapter(chap)}
                      disabled={isDeleting}
                      title="Delete chapter"
                      className="opacity-40 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      {isDeleting ? (
                        <Loader2 size={13} className="animate-spin text-rose-500" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Term 2 Column */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Term 2 Syllabus</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {term2Chapters.length} {term2Chapters.length === 1 ? 'Chapter' : 'Chapters'}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            {term2Chapters.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <FileText size={22} className="mx-auto text-slate-300" />
                <p>No Term 2 chapters added yet</p>
              </div>
            ) : (
              term2Chapters.map((chap, idx) => {
                const isDeleting = deletingChapterId === chap.id;
                return (
                  <div
                    key={chap.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100/70 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {chap.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteChapter(chap)}
                      disabled={isDeleting}
                      title="Delete chapter"
                      className="opacity-40 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      {isDeleting ? (
                        <Loader2 size={13} className="animate-spin text-rose-500" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
