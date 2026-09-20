'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  UserCheck,
  AlertCircle,
  GraduationCap,
  ChevronRight,
  Loader2,
  FolderPlus,
  School,
  Sparkles,
} from 'lucide-react';
import { AcademicClass, AcademicSubject, TeacherAllocation, Profile, Chapter } from '@/types/supabase';

interface ClassSubjectListProps {
  classes: AcademicClass[];
  activeClassId: string | null;
  onSelectClass: (classId: string) => void;
  subjects: AcademicSubject[];
  activeSubjectId: string | null;
  onSelectSubject: (subjectId: string) => void;
  allocations: TeacherAllocation[];
  chapters: Chapter[];
  teachers: Profile[];
  onOpenAllocationModal: (subject: AcademicSubject) => void;
  onCreateClass: (className: string) => Promise<boolean>;
  onCreateSubject: (classId: string, subjectName: string) => Promise<boolean>;
  onDeleteSubject: (subjectId: string, subjectName: string) => Promise<boolean>;
}

export default function ClassSubjectList({
  classes,
  activeClassId,
  onSelectClass,
  subjects,
  activeSubjectId,
  onSelectSubject,
  allocations,
  chapters,
  teachers,
  onOpenAllocationModal,
  onCreateClass,
  onCreateSubject,
  onDeleteSubject,
}: ClassSubjectListProps) {
  // Class creation state
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // Subject creation state
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Subject deletion state
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  const activeClass = classes.find((c) => c.id === activeClassId);

  // Filter subjects for the active class
  const classSubjects = subjects.filter((s) => s.class_id === activeClassId);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || isSubmittingClass) return;
    setIsSubmittingClass(true);
    const success = await onCreateClass(newClassName.trim());
    setIsSubmittingClass(false);
    if (success) {
      setNewClassName('');
      setIsAddingClass(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !activeClassId || isSubmittingSubject) return;
    setIsSubmittingSubject(true);
    const success = await onCreateSubject(activeClassId, newSubjectName.trim());
    setIsSubmittingSubject(false);
    if (success) {
      setNewSubjectName('');
      setIsAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (subject: AcademicSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete "${subject.name}"?\n\nWARNING: Deleting this subject will automatically cascade and permanently remove all its chapters, syllabus progress, and teacher allocations.`
    );
    if (!confirmed) return;

    setDeletingSubjectId(subject.id);
    await onDeleteSubject(subject.id, subject.name);
    setDeletingSubjectId(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. Class Selector Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School size={16} className="text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Academic Cohorts / Classes
            </h3>
          </div>
          <button
            onClick={() => setIsAddingClass(!isAddingClass)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
          >
            <Plus size={13} />
            <span>{isAddingClass ? 'Cancel' : 'New Class'}</span>
          </button>
        </div>

        {/* Inline Add Class Form */}
        {isAddingClass && (
          <form
            onSubmit={handleAddClass}
            className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 animate-in fade-in duration-150"
          >
            <label className="block text-xs font-medium text-slate-700">
              Class Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Class 10, Grade 9..."
                disabled={isSubmittingClass}
                required
                className="flex-1 px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!newClassName.trim() || isSubmittingClass}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isSubmittingClass ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                <span>Add</span>
              </button>
            </div>
          </form>
        )}

        {/* Classes Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {classes.length === 0 ? (
            <div className="text-xs text-slate-400 py-1">
              No classes defined yet. Click &ldquo;New Class&rdquo; above.
            </div>
          ) : (
            classes.map((c) => {
              const isActive = c.id === activeClassId;
              const subjectCount = subjects.filter((s) => s.class_id === c.id).length;

              return (
                <button
                  key={c.id}
                  onClick={() => onSelectClass(c.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span>{c.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-slate-800 text-emerald-400'
                        : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    {subjectCount}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Subjects List Card for Active Class */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {activeClass ? `${activeClass.name} Subjects` : 'Subjects'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Select a subject to build its term syllabus or allocate faculty
            </p>
          </div>

          {activeClassId && (
            <button
              onClick={() => setIsAddingSubject(!isAddingSubject)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
            >
              <Plus size={13} />
              <span>{isAddingSubject ? 'Cancel' : 'Add Subject'}</span>
            </button>
          )}
        </div>

        {/* Inline Add Subject Form */}
        {isAddingSubject && activeClassId && (
          <form
            onSubmit={handleAddSubject}
            className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 animate-in fade-in duration-150"
          >
            <label className="block text-xs font-semibold text-slate-700">
              New Subject for {activeClass?.name}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Mathematics, Science, English..."
                disabled={isSubmittingSubject}
                required
                className="flex-1 px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!newSubjectName.trim() || isSubmittingSubject}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isSubmittingSubject ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                <span>Save</span>
              </button>
            </div>
          </form>
        )}

        {/* Subjects Card List */}
        <div className="space-y-2.5">
          {!activeClassId ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Please select or create an academic class above.
            </div>
          ) : classSubjects.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <BookOpen size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-600">
                No subjects added to {activeClass?.name} yet
              </p>
              <p className="text-[11px] text-slate-400">
                Click &ldquo;Add Subject&rdquo; above to add Mathematics, Science, etc.
              </p>
            </div>
          ) : (
            classSubjects.map((sub) => {
              const isSelected = sub.id === activeSubjectId;
              const subChapters = chapters.filter((c) => c.subject_id === sub.id);
              const term1Count = subChapters.filter((c) => c.term === 'Term 1').length;
              const term2Count = subChapters.filter((c) => c.term === 'Term 2').length;

              // Find assigned teacher
              const allocation = allocations.find((a) => a.subject_id === sub.id);
              const teacherProfile = allocation
                ? teachers.find(
                    (t) =>
                      t.id === allocation.teacher_id || t.id === allocation.staff_id
                  )
                : null;

              const isDeleting = deletingSubjectId === sub.id;

              return (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubject(sub.id)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500/80 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/10'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                          {sub.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Chapter stats badge */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{subChapters.length} Chapters</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-indigo-600 font-medium">
                          T1: {term1Count}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-medium">
                          T2: {term2Count}
                        </span>
                      </div>
                    </div>

                    {/* Delete subject button */}
                    <button
                      onClick={(e) => handleDeleteSubject(sub, e)}
                      disabled={isDeleting}
                      title="Delete Subject (Cascades to chapters & allocations)"
                      className="opacity-60 hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      {isDeleting ? (
                        <Loader2 size={14} className="animate-spin text-rose-500" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>

                  {/* Teacher Allocation Section */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 text-xs">
                      {teacherProfile ? (
                        <div className="flex items-center gap-1.5 text-slate-700 truncate font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="truncate">
                            {teacherProfile.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-medium">
                          <AlertCircle size={12} />
                          <span>Unassigned</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAllocationModal(sub);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg border border-slate-200/80 hover:border-emerald-200 transition flex-shrink-0"
                    >
                      <UserCheck size={12} />
                      <span>{teacherProfile ? 'Reassign' : 'Assign Faculty'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
