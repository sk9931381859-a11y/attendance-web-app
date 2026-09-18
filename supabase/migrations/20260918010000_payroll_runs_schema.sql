-- ==============================================================================
-- Attendance Web App - Migration: Payroll Locking Engine
-- Phase 1: payroll_runs Table, Indexes, & RLS Policies
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    month_end DATE NOT NULL,
    base_salary NUMERIC NOT NULL DEFAULT 0,
    lop_days NUMERIC NOT NULL DEFAULT 0,
    deduction_amount NUMERIC NOT NULL DEFAULT 0,
    net_salary NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'locked',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_payroll_runs_staff_id ON public.payroll_runs(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON public.payroll_runs(month_start, month_end);

-- Prevent duplicate locked payroll entries for the same staff in the same month
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_staff_monthly_payroll 
    ON public.payroll_runs(staff_id, month_start, month_end);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and service_role to read and insert
DROP POLICY IF EXISTS "Allow authenticated users to read payroll_runs" ON public.payroll_runs;
CREATE POLICY "Allow authenticated users to read payroll_runs"
    ON public.payroll_runs
    FOR SELECT
    TO authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert payroll_runs" ON public.payroll_runs;
CREATE POLICY "Allow authenticated users to insert payroll_runs"
    ON public.payroll_runs
    FOR INSERT
    TO authenticated, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update payroll_runs" ON public.payroll_runs;
CREATE POLICY "Allow authenticated users to update payroll_runs"
    ON public.payroll_runs
    FOR UPDATE
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);
