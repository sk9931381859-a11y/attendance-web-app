/**
 * Supabase Database & Entity Type Definitions
 * Includes Shifts, JSONB Rules Override, Attendance Lateness Engine, Payroll Runs, and Faculty Hub
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

export interface School {
  id: string;
  name: string;
  address?: string | null;
  pincode?: string | null;
  school_code: string;
  kiosk_pin: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  role: 'staff' | 'admin';
  school_id?: string | null;
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
  school_id?: string | null;
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

// =============================================================================
// Faculty Hub Subsystem Types
// =============================================================================

export interface AcademicClass {
  id: string;
  grade: string;
  section: string;
  created_at?: string;
}

export interface AcademicSubject {
  id: string;
  name: string;
  created_at?: string;
}

export interface TeacherAllocation {
  id: string;
  staff_id: string;
  class_id: string;
  subject_id: string;
  is_class_teacher: boolean;
  created_at?: string;
  profiles?: Profile | null;
  academic_classes?: AcademicClass | null;
  academic_subjects?: AcademicSubject | null;
}

export interface Chapter {
  id: string;
  subject_id: string;
  class_id: string;
  chapter_number: number;
  title: string;
  created_at?: string;
  academic_subjects?: AcademicSubject | null;
  academic_classes?: AcademicClass | null;
}

export interface ChapterProgress {
  id: string;
  chapter_id: string;
  staff_id: string;
  school_id?: string | null;
  theory_completed: boolean;
  qa_completed: boolean;
  notebooks_checked: boolean;
  is_locked: boolean;
  target_completion_date?: string | null;
  locked_at?: string | null;
  created_at?: string;
  chapters?: Chapter | null;
  profiles?: Profile | null;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  school_id?: string | null;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_at: string;
  created_at?: string;
  profiles?: Profile | null;
}

export interface SchoolNotice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by?: string | null;
  created_at?: string;
  profiles?: Profile | null;
}

export interface TimetableEntry {
  id: string;
  staff_id: string;
  day_of_week: number;
  period_number: number;
  class_id: string;
  subject_id: string;
  created_at?: string;
  profiles?: Profile | null;
  academic_classes?: AcademicClass | null;
  academic_subjects?: AcademicSubject | null;
}

// Alias for TimetableEntry
export type Timetable = TimetableEntry;

export interface OverdueChapter {
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
  grade: string;
  section: string;
  subject_name: string;
  target_completion_date: string;
  days_delayed: number;
  theory_completed: boolean;
  qa_completed: boolean;
  notebooks_checked: boolean;
  is_locked: boolean;
}

// Alias for OverdueChapter / PacingDeviation
export type PacingDeviation = OverdueChapter;

export interface DatabaseRPC {
  get_monthly_penalties: {
    Args: {
      p_staff_id: string;
      p_month_start: string;
      p_month_end: string;
    };
    Returns: number;
  };
  get_pacing_deviations: {
    Args: {
      p_staff_id: string;
    };
    Returns: OverdueChapter[];
  };
}
