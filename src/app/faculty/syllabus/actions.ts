'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Chapter, ChapterProgress, TeacherAllocation } from '@/types/supabase';

export type ProgressField = 'explained_at' | 'exercise_discussed_at' | 'copy_checked_at';

export interface AllocationWithSyllabus {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string;
  subject_name: string;
  class_name: string;
  chapters: Chapter[];
}

export interface TeacherSyllabusData {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  schoolName: string;
  allocations: AllocationWithSyllabus[];
  progressMap: Record<string, Partial<ChapterProgress>>; // keyed by chapter_id
}

/**
 * Fetch all subject allocations and syllabus chapters assigned to the authenticated teacher.
 */
export async function getTeacherSyllabusData(): Promise<TeacherSyllabusData> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Please sign in to access the syllabus tracker.');
  }

  // 1. Fetch teacher profile & school info
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, school_id')
    .eq('id', user.id)
    .maybeSingle();

  let schoolName = 'Apex Global Academy';
  const schoolId = profile?.school_id || (user.app_metadata as any)?.school_id;
  if (schoolId) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .maybeSingle();
    if (school?.name) schoolName = school.name;
  }

  // 2. Query teacher_allocations for this teacher (supporting both teacher_id and staff_id)
  const { data: rawAllocations, error: allocError } = await supabase
    .from('teacher_allocations')
    .select(`
      id,
      school_id,
      teacher_id,
      staff_id,
      subject_id,
      academic_subjects (
        id,
        name,
        class_id,
        academic_classes (
          id,
          name
        ),
        chapters (
          id,
          school_id,
          subject_id,
          name,
          term,
          order_index,
          created_at
        )
      )
    `)
    .or(`teacher_id.eq.${user.id},staff_id.eq.${user.id}`);

  if (allocError) {
    console.error('Error fetching teacher allocations:', allocError);
    throw new Error('Failed to fetch allocations.');
  }

  const validAllocations = (rawAllocations || []).filter((a) => {
    const subj = Array.isArray(a.academic_subjects)
      ? a.academic_subjects[0]
      : a.academic_subjects;
    return Boolean(subj?.name);
  });

  const subjectIds = Array.from(new Set(validAllocations.map((a) => a.subject_id)));
  const allocationIds = validAllocations.map((a) => a.id);

  // 3. Also fetch direct query on chapters table to guarantee complete data
  let directChaptersList: Chapter[] = [];
  if (subjectIds.length > 0) {
    const { data: chaps, error: chapsError } = await supabase
      .from('chapters')
      .select('*')
      .in('subject_id', subjectIds)
      .order('order_index', { ascending: true });

    if (chapsError) {
      console.error('Error fetching chapters directly:', chapsError);
    } else {
      directChaptersList = chaps || [];
    }
  }

  // 4. Fetch chapter_progress records for these allocations
  const progressMap: Record<string, Partial<ChapterProgress>> = {};
  if (allocationIds.length > 0) {
    const { data: progList, error: progError } = await supabase
      .from('chapter_progress')
      .select('*')
      .in('allocation_id', allocationIds);

    if (progError) {
      console.error('Error fetching chapter progress:', progError);
    } else if (progList) {
      for (const p of progList) {
        progressMap[p.chapter_id] = p;
      }
    }
  }

  // 5. Structure data into AllocationWithSyllabus (merging nested & direct chapters)
  const allocations: AllocationWithSyllabus[] = validAllocations.map((a) => {
    const subj = Array.isArray(a.academic_subjects)
      ? a.academic_subjects[0]
      : a.academic_subjects;
    const cls = Array.isArray(subj?.academic_classes)
      ? subj?.academic_classes[0]
      : subj?.academic_classes;

    const nestedChapters: Chapter[] = Array.isArray(subj?.chapters)
      ? subj.chapters
      : [];
    const directChapters: Chapter[] = directChaptersList.filter(
      (c) => c.subject_id === a.subject_id
    );

    // Merge chapters by ID to eliminate any duplicate entries
    const chapterMap = new Map<string, Chapter>();
    for (const c of directChapters) {
      chapterMap.set(c.id, c);
    }
    for (const c of nestedChapters) {
      chapterMap.set(c.id, c);
    }

    const subChapters = Array.from(chapterMap.values()).sort(
      (x, y) => (x.order_index || 0) - (y.order_index || 0)
    );

    return {
      id: a.id,
      school_id: a.school_id || schoolId || '',
      teacher_id: a.teacher_id || user.id,
      subject_id: a.subject_id,
      subject_name: subj?.name || 'Subject',
      class_name: cls?.name || 'Class',
      chapters: subChapters,
    };
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: profile?.name || user.email?.split('@')[0] || 'Teacher',
    },
    schoolName,
    allocations,
    progressMap,
  };
}

/**
 * Mutate syllabus progression (The 40/40/20 Logic)
 * Sets the specified milestone field to NOW() when completed, or NULL when unchecked.
 */
export async function updateChapterProgress(
  allocationId: string,
  chapterId: string,
  field: ProgressField,
  isCompleted: boolean
): Promise<{ success: boolean; progress?: any; error?: string }> {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Security verify: ensure the allocation belongs to this teacher
    const { data: alloc, error: allocErr } = await supabase
      .from('teacher_allocations')
      .select('id, school_id, teacher_id, staff_id')
      .eq('id', allocationId)
      .maybeSingle();

    if (allocErr || !alloc) {
      return { success: false, error: 'Allocation not found' };
    }

    const isOwner = alloc.teacher_id === user.id || alloc.staff_id === user.id;
    if (!isOwner) {
      return { success: false, error: 'Unauthorized: Allocation does not belong to your profile' };
    }

    const schoolId = alloc.school_id || '11111111-1111-1111-1111-111111111111';
    const timestampValue = isCompleted ? new Date().toISOString() : null;

    // Check if progress record already exists for this allocation and chapter
    const { data: existing, error: findErr } = await supabase
      .from('chapter_progress')
      .select('id')
      .eq('allocation_id', allocationId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    if (findErr) {
      console.error('Find progress error:', findErr);
    }

    let resultProgress: any = null;

    if (existing) {
      // Update existing record
      const { data: updated, error: updateErr } = await supabase
        .from('chapter_progress')
        .update({
          [field]: timestampValue,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) {
        console.error('Update progress error:', updateErr);
        return { success: false, error: updateErr.message };
      }
      resultProgress = updated;
    } else {
      // Insert new record
      const { data: inserted, error: insertErr } = await supabase
        .from('chapter_progress')
        .insert([
          {
            school_id: schoolId,
            allocation_id: allocationId,
            chapter_id: chapterId,
            [field]: timestampValue,
          },
        ])
        .select()
        .single();

      if (insertErr) {
        console.error('Insert progress error:', insertErr);
        return { success: false, error: insertErr.message };
      }
      resultProgress = inserted;
    }

    revalidatePath('/faculty/syllabus');
    return { success: true, progress: resultProgress };
  } catch (err: any) {
    console.error('updateChapterProgress unexpected error:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}
