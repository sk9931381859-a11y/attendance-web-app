-- =============================================================================
-- Migration: Faculty Hub Schema (Lazy-Evaluation Architecture)
-- Timestamp: 2026-09-18 02:00:00
-- =============================================================================

-- 1. Academic Classes
CREATE TABLE IF NOT EXISTS public.academic_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_academic_classes_grade_section UNIQUE (grade, section)
);

-- 2. Academic Subjects
CREATE TABLE IF NOT EXISTS public.academic_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Teacher Allocations
CREATE TABLE IF NOT EXISTS public.teacher_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
    is_class_teacher BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_teacher_allocations UNIQUE (staff_id, class_id, subject_id)
);

-- 4. Chapters (Curriculum breakdown)
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_chapters_subject_class_number UNIQUE (subject_id, class_id, chapter_number)
);

-- 5. Chapter Progress (Granular syllabus tracking)
CREATE TABLE IF NOT EXISTS public.chapter_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    theory_completed BOOLEAN DEFAULT false NOT NULL,
    qa_completed BOOLEAN DEFAULT false NOT NULL,
    notebooks_checked BOOLEAN DEFAULT false NOT NULL,
    is_locked BOOLEAN DEFAULT false NOT NULL,
    target_completion_date DATE,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_chapter_progress_chapter_staff UNIQUE (chapter_id, staff_id)
);

-- 6. Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    applied_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. School Notices
CREATE TABLE IF NOT EXISTS public.school_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Timetables
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 12),
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_timetables_staff_slot UNIQUE (staff_id, day_of_week, period_number)
);

-- =============================================================================
-- 9. RPC Function: get_pacing_deviations
-- Zero background CPU load: Computes deviations on-demand via database joins
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_pacing_deviations(p_staff_id UUID)
RETURNS TABLE (
    chapter_id UUID,
    chapter_number INTEGER,
    chapter_title TEXT,
    grade TEXT,
    section TEXT,
    subject_name TEXT,
    target_completion_date DATE,
    days_delayed INTEGER,
    theory_completed BOOLEAN,
    qa_completed BOOLEAN,
    notebooks_checked BOOLEAN,
    is_locked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chapter_id,
        c.chapter_number,
        c.title AS chapter_title,
        ac.grade,
        ac.section,
        asub.name AS subject_name,
        cp.target_completion_date,
        (CURRENT_DATE - cp.target_completion_date)::INTEGER AS days_delayed,
        cp.theory_completed,
        cp.qa_completed,
        cp.notebooks_checked,
        cp.is_locked
    FROM public.chapter_progress cp
    JOIN public.chapters c ON c.id = cp.chapter_id
    JOIN public.academic_classes ac ON ac.id = c.class_id
    JOIN public.academic_subjects asub ON asub.id = c.subject_id
    WHERE cp.staff_id = p_staff_id
      AND cp.target_completion_date IS NOT NULL
      AND cp.target_completion_date < CURRENT_DATE
      AND cp.is_locked = false
    ORDER BY cp.target_completion_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pacing_deviations(UUID) TO authenticated, service_role, anon;

-- =============================================================================
-- 10. Enable Row Level Security (RLS) & Policies
-- Generous authenticated policies to ensure frictionless UI development
-- =============================================================================

ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- academic_classes policies
CREATE POLICY "Allow authenticated read/write on academic_classes"
    ON public.academic_classes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- academic_subjects policies
CREATE POLICY "Allow authenticated read/write on academic_subjects"
    ON public.academic_subjects
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- teacher_allocations policies
CREATE POLICY "Allow authenticated read/write on teacher_allocations"
    ON public.teacher_allocations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- chapters policies
CREATE POLICY "Allow authenticated read/write on chapters"
    ON public.chapters
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- chapter_progress policies
CREATE POLICY "Allow authenticated read/write on chapter_progress"
    ON public.chapter_progress
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- leave_requests policies
CREATE POLICY "Allow authenticated read/write on leave_requests"
    ON public.leave_requests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- school_notices policies
CREATE POLICY "Allow authenticated read/write on school_notices"
    ON public.school_notices
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- timetables policies
CREATE POLICY "Allow authenticated read/write on timetables"
    ON public.timetables
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
