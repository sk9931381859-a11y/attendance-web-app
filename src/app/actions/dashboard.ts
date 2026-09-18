'use server';

import { createClient } from '@/lib/supabase/server';

export interface StaffAttendanceItem {
  id: string; // profile id
  name: string;
  shiftStartTime: string;
  attendanceId: string | null;
  checkInTime: string | null;
  status: 'present' | 'late' | 'absent' | 'pending';
  isLate?: boolean;
  minutesLate?: number;
}

export interface DashboardSummary {
  date: string;
  totalStaff: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  pendingCount: number;
  attendanceRate: number;
  staffList: StaffAttendanceItem[];
}

/**
 * Server Action: Fetches today's live attendance summary across all registered profiles.
 */
export async function getTodayAttendanceSummaryAction(): Promise<DashboardSummary> {
  const todayDate = new Date().toISOString().split('T')[0];

  try {
    const supabase = createClient();

    // 1. Fetch all teacher profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, shift_start_time')
      .order('name', { ascending: true });

    if (profileError) {
      console.error('Error fetching profiles for dashboard:', profileError);
      return {
        date: todayDate,
        totalStaff: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        pendingCount: 0,
        attendanceRate: 0,
        staffList: [],
      };
    }

    // 2. Fetch today's attendance logs with is_late flag calculated by Postgres trigger
    const startOfDay = `${todayDate}T00:00:00.000Z`;
    const endOfDay = `${todayDate}T23:59:59.999Z`;

    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('id, teacher_id, check_in_time, status, is_late, minutes_late')
      .gte('check_in_time', startOfDay)
      .lte('check_in_time', endOfDay);

    if (logsError) {
      console.error('Error fetching attendance logs for dashboard:', logsError);
    }

    // Map logs by teacher_id
    const logsMap = new Map<string, NonNullable<typeof logs>[number]>();
    (logs || []).forEach((log) => {
      logsMap.set(log.teacher_id, log);
    });

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let pendingCount = 0;

    const staffList: StaffAttendanceItem[] = (profiles || []).map((p) => {
      const log = logsMap.get(p.id);
      let status: 'present' | 'late' | 'absent' | 'pending' = 'pending';
      const isLate = Boolean((log as any)?.is_late);
      const minutesLate = Number((log as any)?.minutes_late || 0);

      if (log) {
        // Late evaluation is automated by Postgres trigger (is_late = true)
        if (isLate || log.status === 'late') {
          status = 'late';
          lateCount++;
        } else if (log.status === 'absent') {
          status = 'absent';
          absentCount++;
        } else if (log.status === 'present') {
          status = 'present';
          presentCount++;
        }
      } else {
        pendingCount++;
      }

      return {
        id: p.id,
        name: p.name,
        shiftStartTime: p.shift_start_time || '08:00:00',
        attendanceId: log?.id || null,
        checkInTime: log?.check_in_time || null,
        status,
        isLate,
        minutesLate,
      };
    });

    const totalStaff = profiles?.length || 0;
    const recordedCount = presentCount + lateCount;
    const attendanceRate = totalStaff > 0 ? Math.round((recordedCount / totalStaff) * 100) : 0;

    return {
      date: todayDate,
      totalStaff,
      presentCount,
      lateCount,
      absentCount,
      pendingCount,
      attendanceRate,
      staffList,
    };
  } catch (err) {
    console.error('Unexpected error in getTodayAttendanceSummaryAction:', err);
    return {
      date: todayDate,
      totalStaff: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      pendingCount: 0,
      attendanceRate: 0,
      staffList: [],
    };
  }
}
