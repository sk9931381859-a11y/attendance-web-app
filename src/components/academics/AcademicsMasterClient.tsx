'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { RefreshCw, BookOpen, Layers, GraduationCap, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  AcademicClass,
  AcademicSubject,
  Chapter,
  TeacherAllocation,
  Profile,
} from '@/types/supabase';
import ClassSubjectList from './ClassSubjectList';
import SyllabusBuilder from './SyllabusBuilder';
import AllocationModal from './AllocationModal';
import AcademicsSkeleton from './AcademicsSkeleton';
import {
  fetchAvailableFaculty,
  assignFaculty,
  unassignFaculty,
} from '@/app/dashboard/academics/actions';

const SLOW_INTERNET_ERROR_MESSAGE =
  'Connection slow. Please check your internet and try again.';

// Timeout wrapper for slow internet handling
function withTimeout<T = any>(
  promise: PromiseLike<T> | Promise<T>,
  timeoutMs = 12000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export default function AcademicsMasterClient() {
  const [supabase] = useState(() => createClient());

  // Data states
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allocations, setAllocations] = useState<TeacherAllocation[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Selection states
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  // Modal states
  const [allocationModalSubject, setAllocationModalSubject] =
    useState<AcademicSubject | null>(null);

  // Loading & refresh states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load all academic data
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Get current user & tenant school_id
      const {
        data: { user },
        error: authErr,
      } = await withTimeout(supabase.auth.getUser());

      if (authErr || !user) {
        throw new Error('AUTH_FAILED');
      }

      const jwtSchoolId =
        (user.app_metadata as any)?.school_id ||
        (user.user_metadata as any)?.school_id;

      // Also get profile to ensure school_id
      let activeSchoolId = jwtSchoolId;
      if (!activeSchoolId) {
        const { data: prof } = await withTimeout(
          supabase.from('profiles').select('school_id').eq('id', user.id).maybeSingle()
        );
        activeSchoolId = prof?.school_id || '11111111-1111-1111-1111-111111111111';
      }

      setSchoolId(activeSchoolId);

      // 2. Parallel queries for academic tables & registered staff
      const [
        classesRes,
        subjectsRes,
        chaptersRes,
        allocationsRes,
        facultyRes,
      ] = await Promise.all([
        withTimeout(
          supabase
            .from('academic_classes')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('name', { ascending: true })
        ),
        withTimeout(
          supabase
            .from('academic_subjects')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('name', { ascending: true })
        ),
        withTimeout(
          supabase
            .from('chapters')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('order_index', { ascending: true })
        ),
        withTimeout(
          supabase
            .from('teacher_allocations')
            .select('*')
            .eq('school_id', activeSchoolId)
        ),
        fetchAvailableFaculty(),
      ]);

      if (
        classesRes.error ||
        subjectsRes.error ||
        chaptersRes.error ||
        allocationsRes.error
      ) {
        throw new Error('QUERY_FAILED');
      }

      const fetchedClasses = classesRes.data || [];
      const fetchedSubjects = subjectsRes.data || [];
      const fetchedChapters = chaptersRes.data || [];
      const fetchedAllocations = allocationsRes.data || [];
      const fetchedTeachers = facultyRes.success ? (facultyRes.data as any) : [];

      setClasses(fetchedClasses);
      setSubjects(fetchedSubjects);
      setChapters(fetchedChapters);
      setAllocations(fetchedAllocations);
      setTeachers(fetchedTeachers);

      // Set default selected class if none active
      setActiveClassId((prev) => {
        if (prev && fetchedClasses.some((c: AcademicClass) => c.id === prev)) return prev;
        return fetchedClasses[0]?.id || null;
      });

      // Set default selected subject if none active
      setActiveSubjectId((prev) => {
        if (prev && fetchedSubjects.some((s: AcademicSubject) => s.id === prev)) return prev;
        return null;
      });
    } catch (err: any) {
      console.error('Academics fetch error:', err);
      toast.error(SLOW_INTERNET_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When active class changes, adjust active subject if needed
  const handleSelectClass = (classId: string) => {
    setActiveClassId(classId);
    // Find first subject in new class
    const firstSubject = subjects.find((s) => s.class_id === classId);
    setActiveSubjectId(firstSubject?.id || null);
  };

  // Create new class
  const handleCreateClass = async (className: string): Promise<boolean> => {
    if (!schoolId) return false;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('academic_classes')
          .insert([
            {
              school_id: schoolId,
              name: className,
            },
          ])
          .select()
          .single()
      );

      if (error) throw error;

      setClasses((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveClassId(data.id);
      toast.success(`"${className}" added successfully.`);
      return true;
    } catch (err: any) {
      console.error('Create class error:', err);
      toast.error(SLOW_INTERNET_ERROR_MESSAGE);
      return false;
    }
  };

  // Create new subject under a class
  const handleCreateSubject = async (
    classId: string,
    subjectName: string
  ): Promise<boolean> => {
    if (!schoolId) return false;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('academic_subjects')
          .insert([
            {
              school_id: schoolId,
              class_id: classId,
              name: subjectName,
            },
          ])
          .select()
          .single()
      );

      if (error) throw error;

      setSubjects((prev) => [...prev, data]);
      setActiveSubjectId(data.id);
      toast.success(`Subject "${subjectName}" added.`);
      return true;
    } catch (err: any) {
      console.error('Create subject error:', err);
      toast.error(SLOW_INTERNET_ERROR_MESSAGE);
      return false;
    }
  };

  // Delete subject (cascades in DB)
  const handleDeleteSubject = async (
    subjectId: string,
    subjectName: string
  ): Promise<boolean> => {
    try {
      const { error } = await withTimeout(
        supabase.from('academic_subjects').delete().eq('id', subjectId)
      );

      if (error) throw error;

      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setChapters((prev) => prev.filter((c) => c.subject_id !== subjectId));
      setAllocations((prev) => prev.filter((a) => a.subject_id !== subjectId));

      if (activeSubjectId === subjectId) {
        setActiveSubjectId(null);
      }

      toast.success(`"${subjectName}" and its syllabus were deleted.`);
      return true;
    } catch (err: any) {
      console.error('Delete subject error:', err);
      toast.error(SLOW_INTERNET_ERROR_MESSAGE);
      return false;
    }
  };

  // Add chapter to syllabus
  const handleAddChapter = async (
    subjectId: string,
    name: string,
    term: 'Term 1' | 'Term 2'
  ): Promise<boolean> => {
    if (!schoolId) return false;
    try {
      const existingInSubject = chapters.filter((c) => c.subject_id === subjectId);
      const nextOrder = existingInSubject.length + 1;

      const { data, error } = await withTimeout(
        supabase
          .from('chapters')
          .insert([
            {
              school_id: schoolId,
              subject_id: subjectId,
              name: name,
              term: term,
              order_index: nextOrder,
            },
          ])
          .select()
          .single()
      );

      if (error) throw error;

      setChapters((prev) => [...prev, data]);
      toast.success(`Chapter added to ${term}.`);
      return true;
    } catch (err: any) {
      console.error('Add chapter error:', err);
      toast.error(SLOW_INTERNET_ERROR_MESSAGE);
      return false;
    }
  };

  // Delete chapter from syllabus
  const handleDeleteChapter = async (
    chapterId: string,
    chapterName: string
  ): Promise<boolean> => {
    try {
      const { error } = await withTimeout(
        supabase.from('chapters').delete().eq('id', chapterId)
      );

      if (error) throw error;

      setChapters((prev) => prev.filter((c) => c.id !== chapterId));
      toast.success(`Chapter "${chapterName}" deleted.`);
      return true;
    } catch (err: any) {
      console.error('Delete chapter error:', err);
      toast.error(SLOW_INTERNET_ERROR_MESSAGE);
      return false;
    }
  };

  // Allocate teacher to subject via Server Action
  const handleAllocateTeacher = async (
    subjectId: string,
    teacherId: string
  ): Promise<boolean> => {
    const res = await assignFaculty(subjectId, teacherId);

    if (!res.success) {
      throw new Error(res.error || 'Failed to assign faculty.');
    }

    if (res.allocation) {
      setAllocations((prev) => [
        ...prev.filter((a) => a.subject_id !== subjectId),
        res.allocation!,
      ]);
    }

    // Re-fetch faculty list in case names updated
    const facRes = await fetchAvailableFaculty();
    if (facRes.success && facRes.data) {
      setTeachers(facRes.data as any);
    }

    return true;
  };

  // Unallocate teacher from subject via Server Action
  const handleUnallocateTeacher = async (subjectId: string): Promise<boolean> => {
    const res = await unassignFaculty(subjectId);

    if (!res.success) {
      throw new Error(res.error || 'Failed to unassign faculty.');
    }

    setAllocations((prev) => prev.filter((a) => a.subject_id !== subjectId));
    return true;
  };

  if (isLoading) {
    return <AcademicsSkeleton />;
  }

  const activeClass = classes.find((c) => c.id === activeClassId) || null;
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || null;

  // Active teacher for allocation modal
  const modalAllocation = allocationModalSubject
    ? allocations.find((a) => a.subject_id === allocationModalSubject.id)
    : null;
  const modalCurrentTeacherId =
    modalAllocation?.teacher_id || modalAllocation?.staff_id || null;

  return (
    <div className="w-full space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-600/10 text-emerald-600 border border-emerald-600/20">
              <BookOpen size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Academics &amp; Syllabus Master
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Top-down master syllabus architecture. Define classes, curriculum chapters by term, and allocate faculty.
          </p>
        </div>

        {/* Header Action: Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'animate-spin text-emerald-600' : ''}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Classes & Subjects (5 columns) */}
        <div className="lg:col-span-5">
          <ClassSubjectList
            classes={classes}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            subjects={subjects}
            activeSubjectId={activeSubjectId}
            onSelectSubject={setActiveSubjectId}
            allocations={allocations}
            chapters={chapters}
            teachers={teachers}
            onOpenAllocationModal={(sub) => setAllocationModalSubject(sub)}
            onCreateClass={handleCreateClass}
            onCreateSubject={handleCreateSubject}
            onDeleteSubject={handleDeleteSubject}
          />
        </div>

        {/* Right Side: Syllabus Builder (7 columns) */}
        <div className="lg:col-span-7">
          <SyllabusBuilder
            activeClass={activeClass}
            activeSubject={activeSubject}
            chapters={chapters}
            allocations={allocations}
            teachers={teachers}
            onAddChapter={handleAddChapter}
            onDeleteChapter={handleDeleteChapter}
            onOpenAllocationModal={(sub) => setAllocationModalSubject(sub)}
          />
        </div>
      </div>

      {/* 3. Teacher Allocation Modal */}
      <AllocationModal
        isOpen={Boolean(allocationModalSubject)}
        onClose={() => setAllocationModalSubject(null)}
        subject={allocationModalSubject}
        activeClass={
          classes.find((c) => c.id === allocationModalSubject?.class_id) || null
        }
        currentTeacherId={modalCurrentTeacherId}
        teachers={teachers}
        onAllocate={handleAllocateTeacher}
        onUnallocate={handleUnallocateTeacher}
      />
    </div>
  );
}
