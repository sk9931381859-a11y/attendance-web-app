-- ==============================================================================
-- Attendance Web App - Migration: Dynamic Student Classes
-- Timestamp: 2026-09-22 00:00:00
-- ==============================================================================

-- 1. Add class text column to public.students
ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS class TEXT;

-- 2. Make class_id nullable to support dynamic classes without foreign key restrictions
ALTER TABLE public.students 
    ALTER COLUMN class_id DROP NOT NULL;

-- 3. Backfill existing students from academic_classes
UPDATE public.students s
SET class = c.name
FROM public.academic_classes c
WHERE s.class_id = c.id 
  AND (s.class IS NULL OR s.class = '');

-- 4. Create index for fast class querying
CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, class);

-- 5. Add unique constraint for roll_number within a school's dynamic class
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_school_class_roll 
    ON public.students(school_id, class, roll_number)
    WHERE class IS NOT NULL;
