/**
 * Supabase Database & Entity Type Definitions
 * Includes Shifts, JSONB Rules Override, and Attendance Lateness Engine
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
