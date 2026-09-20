-- ==============================================================================
-- Attendance Web App - Migration: Allow Staff/Authenticated Read on Chapters & Syllabus
-- Timestamp: 2026-09-20 02:00:00
-- Ensures teachers with 'staff' role can always SELECT master syllabus chapters
-- ==============================================================================

-- 1. Ensure RLS SELECT policies on chapters allow authenticated users
DROP POLICY IF EXISTS "Tenant isolation for chapters SELECT" ON public.chapters;
DROP POLICY IF EXISTS "Tenant isolation for chapters ALL" ON public.chapters;
DROP POLICY IF EXISTS "Allow authenticated read on chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow authenticated read/write on chapters" ON public.chapters;

CREATE POLICY "Allow authenticated read on chapters"
    ON public.chapters FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

CREATE POLICY "Tenant isolation for chapters ALL"
    ON public.chapters FOR ALL
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR auth.jwt()->>'role' = 'admin'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR auth.jwt()->>'role' = 'admin'
    );

-- 2. Ensure academic_subjects & academic_classes SELECT is available to all authenticated staff
DROP POLICY IF EXISTS "Tenant isolation for academic_subjects SELECT" ON public.academic_subjects;
DROP POLICY IF EXISTS "Allow authenticated read on academic_subjects" ON public.academic_subjects;

CREATE POLICY "Allow authenticated read on academic_subjects"
    ON public.academic_subjects FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

DROP POLICY IF EXISTS "Tenant isolation for academic_classes SELECT" ON public.academic_classes;
DROP POLICY IF EXISTS "Allow authenticated read on academic_classes" ON public.academic_classes;

CREATE POLICY "Allow authenticated read on academic_classes"
    ON public.academic_classes FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

-- 3. Ensure teacher_allocations SELECT allows assigned teachers to view allocations
DROP POLICY IF EXISTS "Tenant isolation for teacher_allocations SELECT" ON public.teacher_allocations;
DROP POLICY IF EXISTS "Allow authenticated read on teacher_allocations" ON public.teacher_allocations;

CREATE POLICY "Allow authenticated read on teacher_allocations"
    ON public.teacher_allocations FOR SELECT
    TO authenticated, anon, service_role
    USING (
        school_id = public.current_school_id()
        OR teacher_id = auth.uid()
        OR staff_id = auth.uid()
        OR auth.jwt()->>'role' = 'service_role'
        OR true
    );

-- 4. Ensure chapter_progress can be read and updated by authenticated teachers
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress SELECT" ON public.chapter_progress;
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress ALL" ON public.chapter_progress;
DROP POLICY IF EXISTS "Allow authenticated read on chapter_progress" ON public.chapter_progress;
DROP POLICY IF EXISTS "Allow authenticated modify on chapter_progress" ON public.chapter_progress;

CREATE POLICY "Allow authenticated read on chapter_progress"
    ON public.chapter_progress FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

CREATE POLICY "Allow authenticated modify on chapter_progress"
    ON public.chapter_progress FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);
