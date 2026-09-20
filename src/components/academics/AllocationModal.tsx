'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  X,
  UserCheck,
  UserX,
  Loader2,
  GraduationCap,
  Sparkles,
  AlertCircle,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Profile, AcademicSubject, AcademicClass } from '@/types/supabase';
import { fetchAvailableFaculty, AvailableFaculty } from '@/app/dashboard/academics/actions';

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AcademicSubject | null;
  activeClass: AcademicClass | null;
  currentTeacherId?: string | null;
  teachers?: Profile[];
  onAllocate: (subjectId: string, teacherId: string) => Promise<boolean>;
  onUnallocate: (subjectId: string) => Promise<boolean>;
}

export default function AllocationModal({
  isOpen,
  onClose,
  subject,
  activeClass,
  currentTeacherId,
  teachers = [],
  onAllocate,
  onUnallocate,
}: AllocationModalProps) {
  const [facultyList, setFacultyList] = useState<AvailableFaculty[]>([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState<boolean>(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    currentTeacherId || null
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch available staff faculty directly from server action when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSelectedTeacherId(currentTeacherId || null);

    let isMounted = true;
    const loadFaculty = async () => {
      setIsLoadingFaculty(true);
      try {
        const res = await fetchAvailableFaculty();
        if (isMounted) {
          if (res.success && res.data.length > 0) {
            setFacultyList(res.data);
          } else if (teachers.length > 0) {
            // Fallback to teachers passed from parent if any
            setFacultyList(
              teachers.map((t) => ({
                id: t.id,
                name: t.name,
                email: t.email,
                role: t.role || 'staff',
                designation: (t as any).designation || null,
                school_id: t.school_id,
              }))
            );
          } else {
            setFacultyList([]);
          }
        }
      } catch (err: any) {
        console.error('Error fetching staff faculty in modal:', err);
        if (teachers.length > 0 && isMounted) {
          setFacultyList(
            teachers.map((t) => ({
              id: t.id,
              name: t.name,
              email: t.email,
              role: t.role || 'staff',
              designation: (t as any).designation || null,
              school_id: t.school_id,
            }))
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFaculty(false);
        }
      }
    };

    loadFaculty();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentTeacherId, teachers]);

  if (!isOpen || !subject) return null;

  // Selected faculty record
  const selectedFaculty = facultyList.find((f) => f.id === selectedTeacherId) || null;
  const currentFaculty = facultyList.find((f) => f.id === currentTeacherId) || null;

  // 2. Submit Allocation with try/catch, loading spinner, and UI toast
  const handleConfirm = async () => {
    if (!selectedTeacherId || !subject || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onAllocate(subject.id, selectedTeacherId);
      if (success) {
        const staffName = selectedFaculty?.name || 'Faculty member';
        toast.success(`"${staffName}" assigned to ${subject.name}.`);
        onClose();
      } else {
        toast.error('Could not save faculty allocation. Please try again.');
      }
    } catch (err: any) {
      console.error('Mutation error assigning faculty:', err);
      toast.error(err.message || 'Failed to save allocation to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Remove Allocation with try/catch, loading spinner, and UI toast
  const handleRemove = async () => {
    if (!subject || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onUnallocate(subject.id);
      if (success) {
        toast.success(`Removed faculty assignment from ${subject.name}.`);
        onClose();
      } else {
        toast.error('Could not remove faculty allocation.');
      }
    } catch (err: any) {
      console.error('Mutation error unassigning faculty:', err);
      toast.error(err.message || 'Failed to remove allocation.');
    } finally {
      setIsSubmitting(false);
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
              <span>Faculty Allocation Desk</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Assign Teacher to {subject.name}
            </h2>
            <p className="text-xs text-slate-500">
              Class context:{' '}
              <span className="font-semibold text-slate-700">
                {activeClass?.name || 'Class'}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Current Allocation Alert (if already allocated) */}
          {currentTeacherId && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Currently Assigned:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {currentFaculty?.name || 'Assigned Faculty'}
                  </strong>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Active
              </span>
            </div>
          )}

          {/* Faculty <select> Dropdown Section */}
          <div className="space-y-2">
            <label
              htmlFor="faculty-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Choose Staff Member (Role: Staff)
            </label>

            {isLoadingFaculty ? (
              <div className="flex items-center justify-center gap-2 py-4 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium animate-pulse">
                <Loader2 size={15} className="animate-spin text-emerald-600" />
                <span>Fetching registered faculty from directory...</span>
              </div>
            ) : facultyList.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={14} />
                  <span>No staff members found</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Ensure teachers have registered with the <strong>staff</strong> role under your school.
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="faculty-select"
                  value={selectedTeacherId || ''}
                  onChange={(e) => setSelectedTeacherId(e.target.value || null)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition font-medium cursor-pointer disabled:opacity-50"
                >
                  <option value="">-- Select a faculty member --</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.email || 'No email'}) {f.designation ? `• ${f.designation}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Only faculty members with the Staff role in your institution are eligible for curriculum allocation.
            </p>
          </div>

          {/* Selected Faculty Profile Preview Card */}
          {selectedFaculty && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                  {selectedFaculty.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {selectedFaculty.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Staff
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {selectedFaculty.email || 'faculty@school.edu'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                <span>Designation: {selectedFaculty.designation || 'Teacher'}</span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck size={13} />
                  <span>Authorized Teacher</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {currentTeacherId ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition disabled:opacity-50 cursor-pointer"
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                !selectedTeacherId ||
                isSubmitting ||
                selectedTeacherId === currentTeacherId
              }
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Allocation...</span>
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
