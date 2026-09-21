-- ==============================================================================
-- Attendance Web App - Migration: Student Attendance System Core (Phase 1)
-- Timestamp: 2026-09-21 00:00:00
-- ==============================================================================

-- 1. Table: public.students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    roll_number INTEGER NOT NULL CHECK (roll_number > 0),
    parent_whatsapp TEXT NOT NULL CHECK (parent_whatsapp ~ '^[0-9]{10,15}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Constraint: Unique (class_id, roll_number) so no two students in the same class share a roll number
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS uq_students_class_roll;
ALTER TABLE public.students ADD CONSTRAINT uq_students_class_roll UNIQUE (class_id, roll_number);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_class_roll ON public.students(class_id, roll_number);

-- ------------------------------------------------------------------------------
-- 2. Table: public.student_attendance
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Constraint: Unique (student_id, date) to strictly prevent duplicate attendance entries for the same day
ALTER TABLE public.student_attendance DROP CONSTRAINT IF EXISTS uq_student_attendance_student_date;
ALTER TABLE public.student_attendance ADD CONSTRAINT uq_student_attendance_student_date UNIQUE (student_id, date);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_school_id ON public.student_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date ON public.student_attendance(student_id, date);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies for Strict Tenant Isolation
-- ------------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- students policies
DROP POLICY IF EXISTS "Tenant isolation for students SELECT" ON public.students;
DROP POLICY IF EXISTS "Tenant isolation for students INSERT" ON public.students;
DROP POLICY IF EXISTS "Tenant isolation for students UPDATE" ON public.students;
DROP POLICY IF EXISTS "Tenant isolation for students DELETE" ON public.students;

CREATE POLICY "Tenant isolation for students SELECT"
    ON public.students FOR SELECT
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for students INSERT"
    ON public.students FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for students UPDATE"
    ON public.students FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for students DELETE"
    ON public.students FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- student_attendance policies
DROP POLICY IF EXISTS "Tenant isolation for student_attendance SELECT" ON public.student_attendance;
DROP POLICY IF EXISTS "Tenant isolation for student_attendance INSERT" ON public.student_attendance;
DROP POLICY IF EXISTS "Tenant isolation for student_attendance UPDATE" ON public.student_attendance;
DROP POLICY IF EXISTS "Tenant isolation for student_attendance DELETE" ON public.student_attendance;

CREATE POLICY "Tenant isolation for student_attendance SELECT"
    ON public.student_attendance FOR SELECT
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for student_attendance INSERT"
    ON public.student_attendance FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for student_attendance UPDATE"
    ON public.student_attendance FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for student_attendance DELETE"
    ON public.student_attendance FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );
