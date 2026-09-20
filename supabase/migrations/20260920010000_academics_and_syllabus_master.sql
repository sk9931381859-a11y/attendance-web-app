-- ==============================================================================
-- Attendance Web App - Migration: Academics & Syllabus Master Architecture (Phase 1)
-- Timestamp: 2026-09-20 01:00:00
-- ==============================================================================

-- 1. Academic Classes (Top-level academic cohorts)
CREATE TABLE IF NOT EXISTS public.academic_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT,
    grade TEXT,
    section TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academic_classes 
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS name TEXT;

-- Drop legacy NOT NULL constraints on grade and section
ALTER TABLE public.academic_classes 
    ALTER COLUMN grade DROP NOT NULL,
    ALTER COLUMN section DROP NOT NULL;

-- Backfill default tenant & names for existing rows if needed
UPDATE public.academic_classes
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

UPDATE public.academic_classes
SET name = CASE 
    WHEN grade IS NOT NULL AND section IS NOT NULL THEN 'Class ' || grade || ' - Sec ' || section
    WHEN grade IS NOT NULL THEN 'Class ' || grade
    ELSE 'Class 10'
END
WHERE name IS NULL OR name = '';

ALTER TABLE public.academic_classes 
    ALTER COLUMN school_id SET NOT NULL,
    ALTER COLUMN name SET NOT NULL;

-- Drop legacy constraint if exists, enforce multi-tenant unique name
ALTER TABLE public.academic_classes DROP CONSTRAINT IF EXISTS uq_academic_classes_grade_section;
ALTER TABLE public.academic_classes DROP CONSTRAINT IF EXISTS uq_academic_classes_school_name;
ALTER TABLE public.academic_classes ADD CONSTRAINT uq_academic_classes_school_name UNIQUE (school_id, name);

CREATE INDEX IF NOT EXISTS idx_academic_classes_school_id ON public.academic_classes(school_id);

-- ------------------------------------------------------------------------------
-- 2. Academic Subjects (Curricular subjects under a class)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academic_subjects
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.academic_classes(id) ON DELETE CASCADE;

-- Drop old global unique constraint on name if it exists so multiple classes can share subject names
ALTER TABLE public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_name_key;

UPDATE public.academic_subjects
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

UPDATE public.academic_subjects
SET class_id = (SELECT id FROM public.academic_classes WHERE school_id = '11111111-1111-1111-1111-111111111111' LIMIT 1)
WHERE class_id IS NULL;

ALTER TABLE public.academic_subjects
    ALTER COLUMN school_id SET NOT NULL,
    ALTER COLUMN class_id SET NOT NULL;

ALTER TABLE public.academic_subjects DROP CONSTRAINT IF EXISTS uq_academic_subjects_school_class_name;
ALTER TABLE public.academic_subjects ADD CONSTRAINT uq_academic_subjects_school_class_name UNIQUE (school_id, class_id, name);

CREATE INDEX IF NOT EXISTS idx_academic_subjects_school_id ON public.academic_subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_subjects_class_id ON public.academic_subjects(class_id);

-- ------------------------------------------------------------------------------
-- 3. Chapters (Term-categorized syllabus breakdown)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    term TEXT NOT NULL CHECK (term IN ('Term 1', 'Term 2')),
    order_index INTEGER DEFAULT 1 NOT NULL,
    title TEXT,
    chapter_number INTEGER,
    class_id UUID REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chapters
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS term TEXT DEFAULT 'Term 1',
    ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;

-- Drop legacy NOT NULL constraints on chapter_number, title, class_id
ALTER TABLE public.chapters
    ALTER COLUMN chapter_number DROP NOT NULL,
    ALTER COLUMN title DROP NOT NULL,
    ALTER COLUMN class_id DROP NOT NULL;

-- Backfill legacy records
UPDATE public.chapters
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

UPDATE public.chapters
SET name = COALESCE(name, title, 'Chapter ' || COALESCE(chapter_number, 1))
WHERE name IS NULL;

UPDATE public.chapters
SET term = 'Term 1'
WHERE term IS NULL;

ALTER TABLE public.chapters
    ALTER COLUMN school_id SET NOT NULL,
    ALTER COLUMN subject_id SET NOT NULL,
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN term SET NOT NULL;

ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_term_check;
ALTER TABLE public.chapters ADD CONSTRAINT chapters_term_check CHECK (term IN ('Term 1', 'Term 2'));

ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS uq_chapters_subject_class_number;

CREATE INDEX IF NOT EXISTS idx_chapters_school_id ON public.chapters(school_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_term ON public.chapters(term);

-- ------------------------------------------------------------------------------
-- 4. Teacher Allocations (Assigning faculty to subjects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.teacher_allocations
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop legacy NOT NULL constraints on staff_id and class_id if present
ALTER TABLE public.teacher_allocations
    ALTER COLUMN staff_id DROP NOT NULL,
    ALTER COLUMN class_id DROP NOT NULL;

-- Backfill teacher_id from staff_id
UPDATE public.teacher_allocations
SET teacher_id = staff_id
WHERE teacher_id IS NULL AND staff_id IS NOT NULL;

UPDATE public.teacher_allocations
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

ALTER TABLE public.teacher_allocations DROP CONSTRAINT IF EXISTS uq_teacher_allocations;
ALTER TABLE public.teacher_allocations DROP CONSTRAINT IF EXISTS uq_teacher_allocations_school_subject_teacher;
ALTER TABLE public.teacher_allocations ADD CONSTRAINT uq_teacher_allocations_school_subject_teacher UNIQUE (school_id, subject_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_allocations_school_id ON public.teacher_allocations(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_allocations_teacher_id ON public.teacher_allocations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_allocations_subject_id ON public.teacher_allocations(subject_id);

-- ------------------------------------------------------------------------------
-- 5. Chapter Progress (Delivery checkpoints per allocation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    allocation_id UUID REFERENCES public.teacher_allocations(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    explained_at TIMESTAMPTZ,
    exercise_discussed_at TIMESTAMPTZ,
    copy_checked_at TIMESTAMPTZ,
    resource_link TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chapter_progress
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS allocation_id UUID REFERENCES public.teacher_allocations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS explained_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS exercise_discussed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS copy_checked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resource_link TEXT;

-- Drop legacy NOT NULL on staff_id if present
ALTER TABLE public.chapter_progress
    ALTER COLUMN staff_id DROP NOT NULL;

-- Drop old constraints
ALTER TABLE public.chapter_progress DROP CONSTRAINT IF EXISTS uq_chapter_progress_chapter_staff;
ALTER TABLE public.chapter_progress DROP CONSTRAINT IF EXISTS uq_chapter_progress_allocation_chapter;

CREATE INDEX IF NOT EXISTS idx_chapter_progress_school_id ON public.chapter_progress(school_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_allocation_id ON public.chapter_progress(allocation_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_chapter_id ON public.chapter_progress(chapter_id);

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies for Strict Tenant Isolation
-- ------------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

-- academic_classes policies
DROP POLICY IF EXISTS "Tenant isolation for academic_classes SELECT" ON public.academic_classes;
DROP POLICY IF EXISTS "Tenant isolation for academic_classes ALL" ON public.academic_classes;
DROP POLICY IF EXISTS "Allow authenticated read/write on academic_classes" ON public.academic_classes;

CREATE POLICY "Tenant isolation for academic_classes SELECT"
    ON public.academic_classes FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for academic_classes ALL"
    ON public.academic_classes FOR ALL
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- academic_subjects policies
DROP POLICY IF EXISTS "Tenant isolation for academic_subjects SELECT" ON public.academic_subjects;
DROP POLICY IF EXISTS "Tenant isolation for academic_subjects ALL" ON public.academic_subjects;
DROP POLICY IF EXISTS "Allow authenticated read/write on academic_subjects" ON public.academic_subjects;

CREATE POLICY "Tenant isolation for academic_subjects SELECT"
    ON public.academic_subjects FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for academic_subjects ALL"
    ON public.academic_subjects FOR ALL
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- chapters policies
DROP POLICY IF EXISTS "Tenant isolation for chapters SELECT" ON public.chapters;
DROP POLICY IF EXISTS "Tenant isolation for chapters ALL" ON public.chapters;
DROP POLICY IF EXISTS "Allow authenticated read/write on chapters" ON public.chapters;

CREATE POLICY "Tenant isolation for chapters SELECT"
    ON public.chapters FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for chapters ALL"
    ON public.chapters FOR ALL
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- teacher_allocations policies
DROP POLICY IF EXISTS "Tenant isolation for teacher_allocations SELECT" ON public.teacher_allocations;
DROP POLICY IF EXISTS "Tenant isolation for teacher_allocations ALL" ON public.teacher_allocations;
DROP POLICY IF EXISTS "Allow authenticated read/write on teacher_allocations" ON public.teacher_allocations;

CREATE POLICY "Tenant isolation for teacher_allocations SELECT"
    ON public.teacher_allocations FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for teacher_allocations ALL"
    ON public.teacher_allocations FOR ALL
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- chapter_progress policies
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress SELECT" ON public.chapter_progress;
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress ALL" ON public.chapter_progress;
DROP POLICY IF EXISTS "Allow authenticated read/write on chapter_progress" ON public.chapter_progress;

CREATE POLICY "Tenant isolation for chapter_progress SELECT"
    ON public.chapter_progress FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for chapter_progress ALL"
    ON public.chapter_progress FOR ALL
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- ------------------------------------------------------------------------------
-- 7. Seed Initial Classes and Subjects for Default Tenant if empty
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_school_id UUID := '11111111-1111-1111-1111-111111111111';
    v_class_10 UUID;
    v_class_9 UUID;
    v_math_id UUID;
    v_science_id UUID;
    v_teacher_id UUID;
BEGIN
    -- Ensure Class 10 exists
    INSERT INTO public.academic_classes (school_id, name, grade, section)
    VALUES (v_school_id, 'Class 10', '10', 'A')
    ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_class_10;

    -- Ensure Class 9 exists
    INSERT INTO public.academic_classes (school_id, name, grade, section)
    VALUES (v_school_id, 'Class 9', '9', 'A')
    ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_class_9;

    -- Ensure Mathematics subject under Class 10
    INSERT INTO public.academic_subjects (school_id, class_id, name)
    VALUES (v_school_id, v_class_10, 'Mathematics')
    ON CONFLICT (school_id, class_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_math_id;

    -- Ensure Science subject under Class 10
    INSERT INTO public.academic_subjects (school_id, class_id, name)
    VALUES (v_school_id, v_class_10, 'Science')
    ON CONFLICT (school_id, class_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_science_id;

    -- Seed Chapters for Class 10 Mathematics
    INSERT INTO public.chapters (school_id, subject_id, name, title, term, order_index)
    SELECT v_school_id, v_math_id, 'Compound Interest', 'Compound Interest', 'Term 1', 1
    WHERE NOT EXISTS (SELECT 1 FROM public.chapters WHERE subject_id = v_math_id AND name = 'Compound Interest');

    INSERT INTO public.chapters (school_id, subject_id, name, title, term, order_index)
    SELECT v_school_id, v_math_id, 'Logarithms', 'Logarithms', 'Term 1', 2
    WHERE NOT EXISTS (SELECT 1 FROM public.chapters WHERE subject_id = v_math_id AND name = 'Logarithms');

    INSERT INTO public.chapters (school_id, subject_id, name, title, term, order_index)
    SELECT v_school_id, v_math_id, 'Quadratic Equations', 'Quadratic Equations', 'Term 2', 1
    WHERE NOT EXISTS (SELECT 1 FROM public.chapters WHERE subject_id = v_math_id AND name = 'Quadratic Equations');

    INSERT INTO public.chapters (school_id, subject_id, name, title, term, order_index)
    SELECT v_school_id, v_math_id, 'Arithmetic Progressions', 'Arithmetic Progressions', 'Term 2', 2
    WHERE NOT EXISTS (SELECT 1 FROM public.chapters WHERE subject_id = v_math_id AND name = 'Arithmetic Progressions');

    -- Find demo teacher (Marcus Vance or first staff)
    SELECT id INTO v_teacher_id FROM public.profiles 
    WHERE school_id = v_school_id AND role = 'staff' 
    ORDER BY (email = 'marcus.vance@attendance.app') DESC, name ASC 
    LIMIT 1;

    -- Allocate demo teacher to Mathematics if found
    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO public.teacher_allocations (school_id, teacher_id, subject_id, staff_id)
        VALUES (v_school_id, v_teacher_id, v_math_id, v_teacher_id)
        ON CONFLICT (school_id, subject_id, teacher_id) DO NOTHING;
    END IF;
END;
$$;
