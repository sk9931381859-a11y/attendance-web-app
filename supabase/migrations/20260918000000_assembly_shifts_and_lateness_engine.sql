-- ==============================================================================
-- Attendance Web App - Migration: Assembly Grace-Period & Strict Late Penalty Engine
-- Phases 1, 2, 3: Shifts, JSONB Overrides, Postgres Triggers, & Payroll Math RPC
-- ==============================================================================

-- ==============================================================================
-- Phase 1: Supabase Database Schema & JSONB Optimization
-- ==============================================================================

-- 1. Create shifts table: id (UUID), shift_name (TEXT), start_time (TIME),
-- default_grace_minutes (INTEGER), late_threshold (INTEGER), and penalty_fraction (DECIMAL)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_name TEXT NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    default_grace_minutes INTEGER NOT NULL DEFAULT 15,
    late_threshold INTEGER NOT NULL DEFAULT 3,
    penalty_fraction DECIMAL(4, 2) NOT NULL DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated and anon to read shifts" ON public.shifts;
CREATE POLICY "Allow all authenticated and anon to read shifts"
    ON public.shifts FOR SELECT
    TO anon, authenticated
    USING (true);

-- Seed initial shifts
INSERT INTO public.shifts (shift_name, start_time, default_grace_minutes, late_threshold, penalty_fraction)
SELECT 'Morning Assembly Shift', '07:30:00'::time, 15, 3, 0.50
WHERE NOT EXISTS (SELECT 1 FROM public.shifts WHERE shift_name = 'Morning Assembly Shift');

INSERT INTO public.shifts (shift_name, start_time, default_grace_minutes, late_threshold, penalty_fraction)
SELECT 'Standard Faculty Shift', '08:00:00'::time, 15, 3, 0.50
WHERE NOT EXISTS (SELECT 1 FROM public.shifts WHERE shift_name = 'Standard Faculty Shift');

INSERT INTO public.shifts (shift_name, start_time, default_grace_minutes, late_threshold, penalty_fraction)
SELECT 'Late Shift', '08:30:00'::time, 10, 3, 0.50
WHERE NOT EXISTS (SELECT 1 FROM public.shifts WHERE shift_name = 'Late Shift');

-- 2. Modify staff table (profiles in Supabase):
-- Add shift_id (UUID, Foreign Key) and rules_override (JSONB - e.g., {"grace_minutes": 15, "threshold": 3})
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rules_override JSONB DEFAULT '{}'::jsonb;

-- Also support standalone 'staff' table if present in other environments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff') THEN
        EXECUTE 'ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS rules_override JSONB DEFAULT ''{}''::jsonb';
    END IF;
END $$;

-- 3. Create or modify attendance table:
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    campus_id UUID,
    punched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'on_time',
    is_late BOOLEAN NOT NULL DEFAULT false,
    minutes_late INTEGER NOT NULL DEFAULT 0,
    distance_meters NUMERIC,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance and daily aggregation
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_punched_at ON public.attendance(punched_at);
CREATE INDEX IF NOT EXISTS idx_attendance_is_late ON public.attendance(is_late);

-- Enable Row Level Security (RLS)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to select attendance" ON public.attendance;
CREATE POLICY "Allow all to select attendance"
    ON public.attendance
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow anon and authenticated to insert attendance" ON public.attendance;
CREATE POLICY "Allow anon and authenticated to insert attendance"
    ON public.attendance
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to attendance" ON public.attendance;
CREATE POLICY "Allow authenticated full access to attendance"
    ON public.attendance
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Ensure lateness columns exist on attendance and attendance_logs
ALTER TABLE public.attendance 
    ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS minutes_late INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.attendance_logs 
    ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS minutes_late INTEGER NOT NULL DEFAULT 0;

-- ==============================================================================
-- Phase 2: The Zero-Cost Postgres Trigger (Shift Compute to Database)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calculate_lateness_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id UUID;
    v_checkin_time TIMESTAMPTZ;
    v_time_only TIME;
    v_shift_id UUID;
    v_rules_override JSONB;
    v_start_time TIME := '08:00:00';
    v_grace_minutes INTEGER := 15;
    v_effective_time TIME;
    v_minutes_late INTEGER := 0;
BEGIN
    -- 1. Extract check-in time and staff identifier from incoming row
    IF TG_TABLE_NAME = 'attendance' THEN
        v_staff_id := NEW.user_id;
        v_checkin_time := COALESCE(NEW.punched_at, now());
    ELSE
        v_staff_id := NEW.teacher_id;
        v_checkin_time := COALESCE(NEW.check_in_time, now());
    END IF;

    -- Extract time portion in UTC
    v_time_only := (v_checkin_time AT TIME ZONE 'UTC')::time;

    -- 2. Fetch staff profile (shift_id, rules_override, and fallback shift_start_time)
    SELECT p.shift_id, p.rules_override, COALESCE(p.shift_start_time, '08:00:00'::time)
    INTO v_shift_id, v_rules_override, v_start_time
    FROM public.profiles p
    WHERE p.id = v_staff_id;

    -- 3. Fetch associated shift default parameters if shift_id is bound
    IF v_shift_id IS NOT NULL THEN
        SELECT s.start_time, s.default_grace_minutes
        INTO v_start_time, v_grace_minutes
        FROM public.shifts s
        WHERE s.id = v_shift_id;
    END IF;

    -- 4. Apply rules_override from JSONB if custom grace period is set
    IF v_rules_override IS NOT NULL AND v_rules_override ? 'grace_minutes' THEN
        v_grace_minutes := (v_rules_override->>'grace_minutes')::integer;
    END IF;

    -- 5. Subtract grace period from punch-in time
    -- If (punch_in_time - grace_period) > start_time => Late
    v_effective_time := v_time_only - (v_grace_minutes * INTERVAL '1 minute');

    IF v_effective_time > v_start_time THEN
        NEW.is_late := true;
        -- Calculate minutes late past shift start time
        v_minutes_late := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_time_only - v_start_time)) / 60)::integer);
        NEW.minutes_late := v_minutes_late;

        -- Synchronize status column if present on table
        IF TG_TABLE_NAME = 'attendance_logs' AND (NEW.status IS NULL OR NEW.status = 'present') THEN
            NEW.status := 'late';
        ELSIF TG_TABLE_NAME = 'attendance' AND (NEW.status IS NULL OR NEW.status = 'on_time') THEN
            NEW.status := 'late';
        END IF;
    ELSE
        NEW.is_late := false;
        NEW.minutes_late := 0;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to attendance table
DROP TRIGGER IF EXISTS trigger_calculate_lateness_attendance ON public.attendance;
CREATE TRIGGER trigger_calculate_lateness_attendance
    BEFORE INSERT ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_lateness_on_insert();

-- Attach trigger to attendance_logs table
DROP TRIGGER IF EXISTS trigger_calculate_lateness_attendance_logs ON public.attendance_logs;
CREATE TRIGGER trigger_calculate_lateness_attendance_logs
    BEFORE INSERT ON public.attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_lateness_on_insert();

-- ==============================================================================
-- Phase 3: Lazy Evaluation RPC (On-the-Fly Payroll Math)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_penalties(
    p_staff_id UUID,
    p_month_start DATE,
    p_month_end DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_late_count INTEGER := 0;
    v_shift_id UUID;
    v_rules_override JSONB;
    v_late_threshold INTEGER := 3;
    v_penalty_fraction DECIMAL(4, 2) := 0.50;
    v_penalty_units NUMERIC := 0;
    v_lop_days NUMERIC := 0;
BEGIN
    -- 1. Dynamically count all rows where is_late = true within date range
    SELECT COUNT(*) INTO v_late_count
    FROM (
        SELECT id FROM public.attendance_logs
        WHERE teacher_id = p_staff_id
          AND is_late = true
          AND (check_in_time AT TIME ZONE 'UTC')::date >= p_month_start
          AND (check_in_time AT TIME ZONE 'UTC')::date <= p_month_end
        UNION ALL
        SELECT id FROM public.attendance
        WHERE user_id = p_staff_id
          AND is_late = true
          AND COALESCE(date, (punched_at AT TIME ZONE 'UTC')::date) >= p_month_start
          AND COALESCE(date, (punched_at AT TIME ZONE 'UTC')::date) <= p_month_end
    ) all_late_records;

    -- 2. Fetch staff profile configuration
    SELECT p.shift_id, p.rules_override
    INTO v_shift_id, v_rules_override
    FROM public.profiles p
    WHERE p.id = p_staff_id;

    -- 3. Fetch shift defaults if available
    IF v_shift_id IS NOT NULL THEN
        SELECT s.late_threshold, s.penalty_fraction
        INTO v_late_threshold, v_penalty_fraction
        FROM public.shifts s
        WHERE s.id = v_shift_id;
    END IF;

    -- 4. Override with rules_override JSONB if custom threshold is configured
    IF v_rules_override IS NOT NULL THEN
        IF v_rules_override ? 'threshold' THEN
            v_late_threshold := (v_rules_override->>'threshold')::integer;
        ELSIF v_rules_override ? 'late_threshold' THEN
            v_late_threshold := (v_rules_override->>'late_threshold')::integer;
        END IF;

        IF v_rules_override ? 'penalty_fraction' THEN
            v_penalty_fraction := (v_rules_override->>'penalty_fraction')::numeric;
        END IF;
    END IF;

    -- Ensure non-zero threshold to avoid division by zero
    v_late_threshold := GREATEST(1, COALESCE(v_late_threshold, 3));

    -- 5. Divide total late marks by threshold, apply penalty fraction (LOP days)
    v_penalty_units := FLOOR(v_late_count::numeric / v_late_threshold::numeric);
    v_lop_days := ROUND(v_penalty_units * v_penalty_fraction, 2);

    RETURN v_lop_days;
END;
$$;
