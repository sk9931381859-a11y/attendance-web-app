/**
 * Supabase Database & Entity Type Definitions
 * Includes Shifts, JSONB Rules Override, Attendance Lateness Engine, and Payroll Runs
 */

export interface RulesOverride {
  grace_minutes?: number;
  threshold?: number;
  late_threshold?: number;
  penalty_fraction?: number;
  [key: string]: unknown;
}

export interface Shift {
  id: string;
  shift_name: string;
  start_time: string;
  default_grace_minutes: number;
  late_threshold: number;
  penalty_fraction: number;
  created_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  role: 'staff' | 'admin';
  designation?: string | null;
  shift_start_time?: string | null;
  shift_id?: string | null;
  rules_override?: RulesOverride | null;
  campus_id?: string | null;
  company_id?: string | null;
  salary?: number | null;
  working_days?: string[] | null;
  registered_device_id?: string | null;
  device_locked_at?: string | null;
  created_at?: string;
}

export interface AttendanceLog {
  id: string;
  teacher_id: string;
  check_in_time: string;
  status: 'present' | 'late' | 'absent';
  is_late: boolean;
  minutes_late: number;
  company_id?: string;
  created_at?: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  campus_id?: string | null;
  punched_at: string;
  status: 'on_time' | 'late' | 'half_day';
  is_late: boolean;
  minutes_late: number;
  distance_meters?: number;
  latitude?: number;
  longitude?: number;
  date?: string;
}

export interface PayrollRun {
  id: string;
  staff_id: string;
  month_start: string;
  month_end: string;
  base_salary: number;
  lop_days: number;
  deduction_amount: number;
  net_salary: number;
  status: 'draft' | 'locked' | 'paid' | string;
  created_at?: string;
  profiles?: {
    name: string;
    email?: string | null;
    designation?: string | null;
  } | null;
}

export interface DatabaseRPC {
  get_monthly_penalties: {
    Args: {
      p_staff_id: string;
      p_month_start: string;
      p_month_end: string;
    };
    Returns: number;
  };
}
