-- ==============================================================================
-- Attendance Web App - Database Migration
-- Specification: tech-spec.md
-- Target: Supabase PostgreSQL with pg_cron
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ------------------------------------------------------------------------------
-- 2. Table: profiles
-- ------------------------------------------------------------------------------
-- id: uuid (Primary Key, references auth.users)
-- name: text (Teacher full name)
-- shift_start_time: time (Scheduled shift start time)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shift_start_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for shift lookup queries
CREATE INDEX IF NOT EXISTS idx_profiles_shift_start_time ON public.profiles(shift_start_time);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. Automatic Profile Creation Trigger (Supabase Auth)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, shift_start_time)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        '08:00:00'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. Table: attendance_logs
-- ------------------------------------------------------------------------------
-- id: uuid (Primary Key, default gen_random_uuid())
-- teacher_id: uuid (Foreign Key -> profiles.id)
-- check_in_time: timestamp with time zone
-- status: text ('present', 'late', 'absent')
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance and daily aggregation
CREATE INDEX IF NOT EXISTS idx_attendance_logs_teacher_id ON public.attendance_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_check_in_time ON public.attendance_logs(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_status ON public.attendance_logs(status);

-- Prevent duplicate check-in entries on the same day for a teacher
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_teacher_daily_attendance
    ON public.attendance_logs(teacher_id, (timezone('utc'::text, check_in_time)::date));

-- Enable Row Level Security (RLS)
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Attendance Logs Policies
DROP POLICY IF EXISTS "Teachers can view own attendance logs" ON public.attendance_logs;
CREATE POLICY "Teachers can view own attendance logs"
    ON public.attendance_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = teacher_id);

-- Service role bypasses RLS for edge functions and cron automation
-- (Default in Supabase: service_role key has bypassrls privilege)

-- ------------------------------------------------------------------------------
-- 5. pg_cron Job: Absent Automation (Daily at 09:00 AM)
-- ------------------------------------------------------------------------------
-- Identifies teachers with no check-in record for the current date
-- Inserts a record with status = 'absent'
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_missing_teachers_absent()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := (timezone('utc'::text, now()))::date;
    v_absent_timestamp TIMESTAMP WITH TIME ZONE := (v_today + TIME '09:00:00') AT TIME ZONE 'utc';
BEGIN
    INSERT INTO public.attendance_logs (teacher_id, check_in_time, status)
    SELECT 
        p.id AS teacher_id,
        v_absent_timestamp AS check_in_time,
        'absent' AS status
    FROM public.profiles p
    WHERE NOT EXISTS (
        SELECT 1 
        FROM public.attendance_logs a
        WHERE a.teacher_id = p.id
          AND (timezone('utc'::text, a.check_in_time))::date = v_today
    );
END;
$$;

-- Schedule the cron job to run daily at 09:00 AM UTC
DO $$
BEGIN
    -- Unschedule existing job if already registered to avoid duplicates
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily_mark_absent_teachers') THEN
        PERFORM cron.unschedule('daily_mark_absent_teachers');
    END IF;
END $$;

SELECT cron.schedule(
    'daily_mark_absent_teachers',
    '0 9 * * *',
    $$SELECT public.mark_missing_teachers_absent();$$
);
