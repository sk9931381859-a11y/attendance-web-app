'use server';

import { createClient } from '@/lib/supabase/server';

export interface StaffAttendanceItem {
  id: string; // profile id
  name: string;
  shiftStartTime: string;
  attendanceId: string | null;
  checkInTime: string | null;
  status: 'present' | 'late' | 'absent' | 'pending';
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
  const supabase = createClient();

  const todayDate = new Date().toISOString().split('T')[0];

  // 1. Fetch all teacher profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, shift_start_time')
    .order('name', { ascending: true });

  if (profileError) {
    console.error('Error fetching profiles for dashboard:', profileError);
    throw new Error('Failed to load staff profiles');
  }

  // 2. Fetch today's attendance logs
  // Since check_in_time is timestamptz, we match records starting from today's 00:00:00 UTC
  const startOfDay = `${todayDate}T00:00:00.000Z`;
  const endOfDay = `${todayDate}T23:59:59.999Z`;

  const { data: logs, error: logsError } = await supabase
    .from('attendance_logs')
    .select('id, teacher_id, check_in_time, status')
    .gte('check_in_time', startOfDay)
    .lte('check_in_time', endOfDay);

  if (logsError) {
    console.error('Error fetching attendance logs for dashboard:', logsError);
    throw new Error('Failed to load attendance logs');
  }

  // Map logs by teacher_id
  const logsMap = new Map<string, (typeof logs)[0]>();
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

    if (log) {
      status = log.status as 'present' | 'late' | 'absent';
      if (status === 'present') presentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'absent') absentCount++;
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
}
