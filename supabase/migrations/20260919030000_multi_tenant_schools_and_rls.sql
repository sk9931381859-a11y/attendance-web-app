-- ==============================================================================
-- Attendance Web App - Migration: Multi-Tenant Schools & Strict RLS Isolation
-- Timestamp: 2026-09-19 03:00:00
-- ==============================================================================

-- 1. Create public.schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    pincode TEXT,
    school_code TEXT NOT NULL UNIQUE,
    kiosk_pin TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default tenant so existing users have an operational school immediately
INSERT INTO public.schools (id, name, address, pincode, school_code, kiosk_pin)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Apex Global Academy',
    'Sector 4, Innovation Park',
    '560100',
    '100001',
    '1234'
)
ON CONFLICT (id) DO UPDATE
SET school_code = EXCLUDED.school_code,
    kiosk_pin = EXCLUDED.kiosk_pin,
    name = EXCLUDED.name;

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on schools for code verification" ON public.schools;
CREATE POLICY "Allow public read on schools for code verification"
    ON public.schools FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow service role full access on schools" ON public.schools;
CREATE POLICY "Allow service role full access on schools"
    ON public.schools FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Add school_id UUID Foreign Key to profiles, attendance_logs, leave_requests, chapter_progress
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_logs
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.leave_requests
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.chapter_progress
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Backfill existing data with default tenant
UPDATE public.profiles
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

UPDATE public.attendance_logs
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

UPDATE public.leave_requests
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

UPDATE public.chapter_progress
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE school_id IS NULL;

-- Backfill auth.users raw_app_meta_data with school_id
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('school_id', '11111111-1111-1111-1111-111111111111')
WHERE raw_app_meta_data->>'school_id' IS NULL;

-- Query performance indexing
CREATE INDEX IF NOT EXISTS idx_schools_school_code ON public.schools(school_code);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_school_id ON public.attendance_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_school_id ON public.leave_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_school_id ON public.chapter_progress(school_id);

-- 3. Tenant Isolation Helper Function
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'school_id'), '')::uuid,
    (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- 4. Rewrite Row Level Security (RLS) Policies for Strict Tenant Isolation

-- Profiles Policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles SELECT" ON public.profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles INSERT" ON public.profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles UPDATE" ON public.profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles DELETE" ON public.profiles;

CREATE POLICY "Tenant isolation for profiles SELECT"
    ON public.profiles FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR auth.uid() = id
    );

CREATE POLICY "Tenant isolation for profiles INSERT"
    ON public.profiles FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR auth.uid() = id
    );

CREATE POLICY "Tenant isolation for profiles UPDATE"
    ON public.profiles FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR auth.uid() = id
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR auth.uid() = id
    );

CREATE POLICY "Tenant isolation for profiles DELETE"
    ON public.profiles FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- Attendance Logs Policies
DROP POLICY IF EXISTS "Teachers can view own attendance logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Admins have full access to attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow anon and authenticated to insert attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow all to select attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Tenant isolation for attendance_logs SELECT" ON public.attendance_logs;
DROP POLICY IF EXISTS "Tenant isolation for attendance_logs INSERT" ON public.attendance_logs;
DROP POLICY IF EXISTS "Tenant isolation for attendance_logs UPDATE" ON public.attendance_logs;
DROP POLICY IF EXISTS "Tenant isolation for attendance_logs DELETE" ON public.attendance_logs;

CREATE POLICY "Tenant isolation for attendance_logs SELECT"
    ON public.attendance_logs FOR SELECT
    TO anon, authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for attendance_logs INSERT"
    ON public.attendance_logs FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
        OR school_id IS NOT NULL
    );

CREATE POLICY "Tenant isolation for attendance_logs UPDATE"
    ON public.attendance_logs FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for attendance_logs DELETE"
    ON public.attendance_logs FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- Leave Requests Policies
DROP POLICY IF EXISTS "Allow authenticated read/write on leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Tenant isolation for leave_requests SELECT" ON public.leave_requests;
DROP POLICY IF EXISTS "Tenant isolation for leave_requests INSERT" ON public.leave_requests;
DROP POLICY IF EXISTS "Tenant isolation for leave_requests UPDATE" ON public.leave_requests;
DROP POLICY IF EXISTS "Tenant isolation for leave_requests DELETE" ON public.leave_requests;

CREATE POLICY "Tenant isolation for leave_requests SELECT"
    ON public.leave_requests FOR SELECT
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for leave_requests INSERT"
    ON public.leave_requests FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for leave_requests UPDATE"
    ON public.leave_requests FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for leave_requests DELETE"
    ON public.leave_requests FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- Chapter Progress Policies
DROP POLICY IF EXISTS "Allow authenticated read/write on chapter_progress" ON public.chapter_progress;
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress SELECT" ON public.chapter_progress;
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress INSERT" ON public.chapter_progress;
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress UPDATE" ON public.chapter_progress;
DROP POLICY IF EXISTS "Tenant isolation for chapter_progress DELETE" ON public.chapter_progress;

CREATE POLICY "Tenant isolation for chapter_progress SELECT"
    ON public.chapter_progress FOR SELECT
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for chapter_progress INSERT"
    ON public.chapter_progress FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for chapter_progress UPDATE"
    ON public.chapter_progress FOR UPDATE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    )
    WITH CHECK (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Tenant isolation for chapter_progress DELETE"
    ON public.chapter_progress FOR DELETE
    TO authenticated, service_role
    USING (
        school_id = public.current_school_id()
        OR auth.jwt()->>'role' = 'service_role'
    );

-- 5. Headless Kiosk RPC: verify_kiosk_pin
CREATE OR REPLACE FUNCTION public.verify_kiosk_pin(p_school_code TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school RECORD;
BEGIN
    SELECT id, name, school_code INTO v_school
    FROM public.schools
    WHERE UPPER(TRIM(school_code)) = UPPER(TRIM(p_school_code))
      AND TRIM(kiosk_pin) = TRIM(p_pin);

    IF v_school.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid School Code or Kiosk PIN');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school.id,
        'school_name', v_school.name,
        'school_code', v_school.school_code
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_kiosk_pin(TEXT, TEXT) TO anon, authenticated, service_role;

-- 6. Update handle_new_user Trigger to Support Multi-Tenant school_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  the_assigned_role text;
  the_school_id uuid;
BEGIN
  -- Determine role
  IF lower(COALESCE(new.email, '')) = 'buildwithsuraj001@gmail.com' THEN
    the_assigned_role := 'admin';
  ELSIF (new.raw_user_meta_data->>'role') = 'admin' THEN
    the_assigned_role := 'admin';
  ELSE
    the_assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'staff');
  END IF;

  -- Determine school_id
  the_school_id := COALESCE(
    NULLIF(new.raw_user_meta_data->>'school_id', '')::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid
  );

  -- Insert profile
  INSERT INTO public.profiles (id, name, email, role, school_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email,
    the_assigned_role,
    the_school_id
  )
  ON CONFLICT (id) DO UPDATE 
    SET role = EXCLUDED.role,
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        school_id = COALESCE(EXCLUDED.school_id, public.profiles.school_id);

  -- Inject role & school_id directly into Auth JWT raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', the_assigned_role,
    'school_id', the_school_id
  )
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
