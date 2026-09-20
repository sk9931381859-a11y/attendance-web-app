'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  UserCheck,
  UserX,
  Loader2,
  Check,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Profile, AcademicSubject, AcademicClass } from '@/types/supabase';

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AcademicSubject | null;
  activeClass: AcademicClass | null;
  currentTeacherId?: string | null;
  teachers: Profile[];
  onAllocate: (subjectId: string, teacherId: string) => Promise<boolean>;
  onUnallocate: (subjectId: string) => Promise<boolean>;
}

const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-indigo-600 text-white',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-teal-600 text-white',
];

export default function AllocationModal({
  isOpen,
  onClose,
  subject,
  activeClass,
  currentTeacherId,
  teachers,
  onAllocate,
  onUnallocate,
}: AllocationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    currentTeacherId || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected teacher with incoming currentTeacherId when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTeacherId(currentTeacherId || null);
      setSearchQuery('');
    }
  }, [isOpen, currentTeacherId]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        (t as any).designation?.toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  if (!isOpen || !subject) return null;

  const handleConfirm = async () => {
    if (!selectedTeacherId) return;
    setIsSubmitting(true);
    const success = await onAllocate(subject.id, selectedTeacherId);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    const success = await onUnallocate(subject.id);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              <GraduationCap size={15} />
              <span>Faculty Allocation</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Assign Teacher to {subject.name}
            </h2>
            <p className="text-xs text-slate-500">
              Class context: <span className="font-semibold text-slate-700">{activeClass?.name || 'Class'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty by name, designation, or email..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400 transition"
            />
          </div>
        </div>

        {/* Teachers List (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2 divide-y divide-slate-50">
          {filteredTeachers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <UserX size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                No matching staff faculty found
              </p>
              <p className="text-xs text-slate-400">
                Check that staff members are registered under your school in the Staff Directory.
              </p>
            </div>
          ) : (
            filteredTeachers.map((teacher, idx) => {
              const isSelected = selectedTeacherId === teacher.id;
              const isCurrent = currentTeacherId === teacher.id;
              const avatarColor =
                AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const initials =
                teacher.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'FC';

              return (
                <div
                  key={teacher.id}
                  onClick={() => !isSubmitting && setSelectedTeacherId(teacher.id)}
                  className={`pt-2 first:pt-0 cursor-pointer transition-all ${
                    isSubmitting ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  <div
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0 ${avatarColor}`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {teacher.name}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {(teacher as any).designation || 'Staff Faculty'} • {teacher.email}
                        </p>
                      </div>
                    </div>

                    {/* Radio indicator */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'border-2 border-slate-300 text-transparent'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {currentTeacherId ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserX size={14} />
              )}
              <span>Unassign Faculty</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              Select a staff member to allocate
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedTeacherId || isSubmitting || selectedTeacherId === currentTeacherId}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck size={14} />
                  <span>Confirm Allocation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
