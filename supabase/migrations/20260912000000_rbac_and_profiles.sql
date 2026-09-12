-- ==============================================================================
-- Attendance Web App - Migration: Role-Based Access Control (RBAC) & Staff Profiles
-- ==============================================================================

-- 1. Ensure `role` column exists in `profiles` with default 'staff' and constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'staff';
    END IF;
END $$;

-- Ensure check constraint on role ('staff', 'admin')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('staff', 'admin'));

-- Ensure `id` has default gen_random_uuid() for direct staff creation
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Relax strict foreign key constraint to auth.users if present, allowing staff profiles without separate login
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Create is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- 3. Update Row Level Security (RLS) Policies on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (public.is_admin() OR auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Allow all users to read profiles" ON public.profiles;
CREATE POLICY "Allow all users to read profiles"
    ON public.profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. Update Row Level Security (RLS) Policies on attendance_logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to attendance_logs" ON public.attendance_logs;
CREATE POLICY "Admins have full access to attendance_logs"
    ON public.attendance_logs
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (public.is_admin() OR auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Allow anon and authenticated to insert attendance_logs" ON public.attendance_logs;
CREATE POLICY "Allow anon and authenticated to insert attendance_logs"
    ON public.attendance_logs
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to select attendance_logs" ON public.attendance_logs;
CREATE POLICY "Allow all to select attendance_logs"
    ON public.attendance_logs
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);
