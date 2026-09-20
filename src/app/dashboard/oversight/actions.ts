'use server';

import { createClient } from '@/lib/supabase/server';
import { Chapter, ChapterProgress } from '@/types/supabase';

export type PaceStatus = 'lagging' | 'on_track' | 'nearing_completion';

export interface ChapterProgressDetail {
  chapter: Chapter;
  explained_at: string | null;
  exercise_discussed_at: string | null;
  copy_checked_at: string | null;
  chapterScore: number; // 0 - 100
  isFullyCompleted: boolean;
}

export interface AllocationProgressSummary {
  id: string; // allocation id
  school_id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email?: string | null;
  subject_id: string;
  subject_name: string;
  class_name: string;
  totalChapters: number;
  completedChapters: number; // chapters with 100% score
  progressPercent: number; // 0 - 100%
  status: PaceStatus;
  statusLabel: string;
  term1Chapters: ChapterProgressDetail[];
  term2Chapters: ChapterProgressDetail[];
  otherChapters: ChapterProgressDetail[];
  allChapters: ChapterProgressDetail[];
}

export interface SchoolAcademicProgressData {
  schoolName: string;
  schoolId: string;
  allocations: AllocationProgressSummary[];
  stats: {
    totalAllocations: number;
    totalTeachers: number;
    totalChapters: number;
    averageCompletion: number;
    laggingCount: number;
    onTrackCount: number;
    nearingCompletionCount: number;
  };
}

/**
 * Calculates the pace status pill based on subject progress percentage:
 * - < 25%: "Lagging" (Red)
 * - 25% - 75%: "On Track" (Yellow/Amber)
 * - > 75%: "Nearing Completion" (Emerald/Green)
 */
export function getPaceStatus(percent: number): { status: PaceStatus; label: string } {
  if (percent < 25) {
    return { status: 'lagging', label: 'Lagging' };
  }
  if (percent <= 75) {
    return { status: 'on_track', label: 'On Track' };
  }
  return { status: 'nearing_completion', label: 'Nearing Completion' };
}

/**
 * Fetch all academic progress analytics for the Admin's school_id.
 * Joins teacher_allocations, profiles, academic_subjects, academic_classes,
 * chapters, and chapter_progress, calculating 40/40/20 pacing statistics.
 */
export async function fetchSchoolAcademicProgress(): Promise<SchoolAcademicProgressData> {
  const supabase = createClient();

  // 1. Authenticate user & ensure Admin privileges
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Please sign in to access academic oversight.');
  }

  // Fetch admin profile
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, name, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = (user.app_metadata as any)?.role || adminProfile?.role || 'staff';
  if (userRole !== 'admin') {
    throw new Error('Forbidden: Only administrators can access Academic Oversight.');
  }

  const schoolId =
    adminProfile?.school_id ||
    (user.app_metadata as any)?.school_id ||
    '11111111-1111-1111-1111-111111111111';

  // 2. Fetch School Name
  let schoolName = 'Apex Global Academy';
  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', schoolId)
    .maybeSingle();
  if (school?.name) {
    schoolName = school.name;
  }

  // 3. Query teacher_allocations strictly for this school_id
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
        )
      )
    `)
    .eq('school_id', schoolId);

  if (allocError) {
    console.error('Error fetching allocations for school:', allocError);
    throw new Error('Failed to load allocations for school.');
  }

  const validAllocations = (rawAllocations || []).filter((a) => {
    const subj = Array.isArray(a.academic_subjects)
      ? a.academic_subjects[0]
      : a.academic_subjects;
    return Boolean(subj?.name);
  });

  // 4. Fetch teacher profiles for all allocations
  const teacherIds = Array.from(
    new Set(
      validAllocations
        .map((a) => a.teacher_id || a.staff_id)
        .filter(Boolean) as string[]
    )
  );

  const teacherProfileMap = new Map<string, { name: string; email?: string }>();
  if (teacherIds.length > 0) {
    const { data: teachers, error: teachersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', teacherIds);

    if (!teachersError && teachers) {
      for (const t of teachers) {
        teacherProfileMap.set(t.id, { name: t.name, email: t.email });
      }
    }
  }

  // 5. Query chapters for all subject IDs in the school's allocations
  const subjectIds = Array.from(new Set(validAllocations.map((a) => a.subject_id)));
  let schoolChapters: Chapter[] = [];
  if (subjectIds.length > 0) {
    const { data: chaps, error: chapsError } = await supabase
      .from('chapters')
      .select('*')
      .in('subject_id', subjectIds)
      .order('order_index', { ascending: true });

    if (!chapsError && chaps) {
      schoolChapters = chaps;
    } else {
      console.error('Error fetching chapters:', chapsError);
    }
  }

  // 6. Query chapter_progress records for all allocations in the school
  const allocationIds = validAllocations.map((a) => a.id);
  const progressMap = new Map<string, Partial<ChapterProgress>>(); // key: `${allocationId}_${chapterId}`
  if (allocationIds.length > 0) {
    const { data: progList, error: progError } = await supabase
      .from('chapter_progress')
      .select('*')
      .in('allocation_id', allocationIds);

    if (!progError && progList) {
      for (const p of progList) {
        const key = `${p.allocation_id}_${p.chapter_id}`;
        progressMap.set(key, p);
      }
    } else if (progError) {
      console.error('Error fetching chapter progress:', progError);
    }
  }

  // 7. Aggregate 40/40/20 data per Subject Allocation
  const allocationSummaries: AllocationProgressSummary[] = validAllocations.map((a) => {
    const subj = Array.isArray(a.academic_subjects)
      ? a.academic_subjects[0]
      : a.academic_subjects;
    const cls = Array.isArray(subj?.academic_classes)
      ? subj?.academic_classes[0]
      : subj?.academic_classes;

    const teacherId = a.teacher_id || a.staff_id || '';
    const teacherProfile = teacherProfileMap.get(teacherId);
    const teacherName = teacherProfile?.name || 'Unassigned Faculty';
    const teacherEmail = teacherProfile?.email;

    // Filter chapters belonging to this subject
    const subjectChapters = schoolChapters
      .filter((c) => c.subject_id === a.subject_id)
      .sort((x, y) => (x.order_index || 0) - (y.order_index || 0));

    let totalPointsEarned = 0;
    let completedChaptersCount = 0;

    const allChapterDetails: ChapterProgressDetail[] = subjectChapters.map((chap) => {
      const key = `${a.id}_${chap.id}`;
      const prog = progressMap.get(key);

      const hasExplained = Boolean(prog?.explained_at);
      const hasExercise = Boolean(prog?.exercise_discussed_at);
      const hasCopyChecked = Boolean(prog?.copy_checked_at);

      let score = 0;
      if (hasExplained) score += 40;
      if (hasExercise) score += 40;
      if (hasCopyChecked) score += 20;

      totalPointsEarned += score;
      if (score === 100) {
        completedChaptersCount += 1;
      }

      return {
        chapter: chap,
        explained_at: prog?.explained_at || null,
        exercise_discussed_at: prog?.exercise_discussed_at || null,
        copy_checked_at: prog?.copy_checked_at || null,
        chapterScore: score,
        isFullyCompleted: score === 100,
      };
    });

    // 40/40/20 Math: Subject Progress = (Sum of all chapter percentages) / (Total chapters)
    const totalChapters = allChapterDetails.length;
    const progressPercent =
      totalChapters > 0 ? Math.round(totalPointsEarned / totalChapters) : 0;

    const { status, label: statusLabel } = getPaceStatus(progressPercent);

    const term1Chapters = allChapterDetails.filter(
      (cd) => cd.chapter.term === 'Term 1'
    );
    const term2Chapters = allChapterDetails.filter(
      (cd) => cd.chapter.term === 'Term 2'
    );
    const otherChapters = allChapterDetails.filter(
      (cd) => cd.chapter.term !== 'Term 1' && cd.chapter.term !== 'Term 2'
    );

    return {
      id: a.id,
      school_id: a.school_id || schoolId,
      teacher_id: teacherId,
      teacher_name: teacherName,
      teacher_email: teacherEmail,
      subject_id: a.subject_id,
      subject_name: subj?.name || 'Subject',
      class_name: cls?.name || 'Class',
      totalChapters,
      completedChapters: completedChaptersCount,
      progressPercent,
      status,
      statusLabel,
      term1Chapters,
      term2Chapters,
      otherChapters,
      allChapters: allChapterDetails,
    };
  });

  // Sort allocations: Lagging first, then On Track, then Nearing Completion
  allocationSummaries.sort((x, y) => {
    const statusWeight: Record<PaceStatus, number> = {
      lagging: 0,
      on_track: 1,
      nearing_completion: 2,
    };
    if (statusWeight[x.status] !== statusWeight[y.status]) {
      return statusWeight[x.status] - statusWeight[y.status];
    }
    return x.progressPercent - y.progressPercent;
  });

  // Calculate high-level school analytics
  const totalAllocations = allocationSummaries.length;
  const totalChapters = allocationSummaries.reduce((sum, a) => sum + a.totalChapters, 0);
  const totalPercentageSum = allocationSummaries.reduce(
    (sum, a) => sum + a.progressPercent,
    0
  );
  const averageCompletion =
    totalAllocations > 0 ? Math.round(totalPercentageSum / totalAllocations) : 0;

  const laggingCount = allocationSummaries.filter((a) => a.status === 'lagging').length;
  const onTrackCount = allocationSummaries.filter((a) => a.status === 'on_track').length;
  const nearingCompletionCount = allocationSummaries.filter(
    (a) => a.status === 'nearing_completion'
  ).length;

  return {
    schoolName,
    schoolId,
    allocations: allocationSummaries,
    stats: {
      totalAllocations,
      totalTeachers: teacherIds.length,
      totalChapters,
      averageCompletion,
      laggingCount,
      onTrackCount,
      nearingCompletionCount,
    },
  };
}
