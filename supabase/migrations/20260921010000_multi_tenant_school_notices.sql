-- ==============================================================================
-- Attendance Web App - Migration: Multi-Tenant Isolation for School Notices
-- Timestamp: 2026-09-21 01:00:00
-- ==============================================================================

-- 1. Add school_id to public.school_notices
ALTER TABLE public.school_notices 
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 2. Backfill existing notices with author profile's school_id or default tenant
UPDATE public.school_notices n
SET school_id = COALESCE(
    (SELECT school_id FROM public.profiles p WHERE p.id = n.created_by),
    '11111111-1111-1111-1111-111111111111'
)
WHERE school_id IS NULL;

-- 3. Enforce NOT NULL on school_id
ALTER TABLE public.school_notices 
    ALTER COLUMN school_id SET NOT NULL;

-- 4. Index for tenant query performance
CREATE INDEX IF NOT EXISTS idx_school_notices_school_id ON public.school_notices(school_id);

-- 5. Strict Multi-Tenant Row Level Security (RLS)
ALTER TABLE public.school_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write on school_notices" ON public.school_notices;
DROP POLICY IF EXISTS "Tenant isolation for school_notices SELECT" ON public.school_notices;
DROP POLICY IF EXISTS "Tenant isolation for school_notices INSERT" ON public.school_notices;
DROP POLICY IF EXISTS "Tenant isolation for school_notices UPDATE" ON public.school_notices;
DROP POLICY IF EXISTS "Tenant isolation for school_notices DELETE" ON public.school_notices;

CREATE POLICY "Tenant isolation for school_notices SELECT"
    ON public.school_notices FOR SELECT
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for school_notices INSERT"
    ON public.school_notices FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for school_notices UPDATE"
    ON public.school_notices FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for school_notices DELETE"
    ON public.school_notices FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );
