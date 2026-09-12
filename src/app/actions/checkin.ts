'use server';

import { createClient } from '@/lib/supabase/server';
import { verifyKioskToken } from '@/lib/totp';

const ON_TIME_GRACE_MINUTES = 10;

export interface CheckInPayload {
  token: string;
  // NOTE: teacherId is strictly NOT accepted from the client.
  // It is extracted securely from the active authenticated session cookie on the server,
  // guaranteeing cryptographic proof of identity.
  teacherId?: string;
}

export interface CheckInErrorObject {
  message: string;
  details?: string;
}

export interface CheckInResponse {
  success: boolean;
  message?: string;
  status?: 'present' | 'late';
  checkInTime?: string;
  teacherName?: string;
  teacherEmail?: string;
  error?: string | CheckInErrorObject;
  details?: string;
  alreadyCheckedIn?: boolean;
}

export interface ScannerSession {
  user: {
    id: string;
    email?: string | null;
  };
  profile: {
    id: string;
    name: string;
    email?: string | null;
    role?: string | null;
    shift_start_time?: string | null;
    designation?: string | null;
  };
}

/**
 * Server Action: Authenticated Check-In Verification & Attendance Commit
 * 
 * SECURITY GUARANTEE:
 * Extracts teacher_id strictly from the authenticated user's active session cookie
 * via supabase.auth.getUser(). Guarantees cryptographic proof of identity.
 * Bypasses client-side identity spoofing completely.
 */
export async function submitCheckInAction(payload: CheckInPayload): Promise<CheckInResponse> {
  const { token } = payload;

  if (!token || typeof token !== 'string') {
    return { success: false, error: 'A valid 6-digit TOTP code is required.' };
  }

  // 1. Verify TOTP token from Kiosk QR code
  let cleanToken = token.trim();
  try {
    if (cleanToken.startsWith('{')) {
      const parsed = JSON.parse(cleanToken);
      if (parsed.token) cleanToken = parsed.token;
    }
  } catch {}

  const isValidToken = verifyKioskToken(cleanToken);
  if (!isValidToken) {
    return {
      success: false,
      error: 'QR Code expired or invalid. Please scan the active kiosk screen.',
    };
  }

  // 2. Cryptographic Proof of Identity: Extract teacher_id from session cookie
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Authentication required. Please sign in with your staff account to record attendance.',
    };
  }

  const teacherId = user.id;

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dayStart = `${todayStr}T00:00:00.000Z`;
    const dayEnd = `${todayStr}T23:59:59.999Z`;

    // Retrieve staff profile for authenticated user
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, shift_start_time, designation')
      .eq('id', teacherId)
      .maybeSingle();

    if (!profile) {
      // If profile not yet linked, provision with auth user metadata or fallback
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: teacherId,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Staff Member',
          email: user.email,
          shift_start_time: '08:00:00',
          role: 'staff',
        })
        .select()
        .single();
      if (newProfile) {
        profile = newProfile;
      }
    }

    const effectiveProfile = profile || {
      id: teacherId,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Staff Member',
      email: user.email,
      shift_start_time: '08:00:00',
    };

    // Determine status (present vs late based on shift_start_time + 10 min grace period)
    let status: 'present' | 'late' = 'present';
    if (effectiveProfile.shift_start_time) {
      const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(effectiveProfile.shift_start_time);
      if (match) {
        const shiftDate = new Date(now);
        shiftDate.setHours(
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3] || '0', 10),
          0
        );
        const graceMs = ON_TIME_GRACE_MINUTES * 60 * 1000;
        if (now.getTime() > shiftDate.getTime() + graceMs) {
          status = 'late';
        }
      }
    }

    // Check duplicate check-in today
    const { data: existingLog } = await supabase
      .from('attendance_logs')
      .select('id, check_in_time, status')
      .eq('teacher_id', teacherId)
      .gte('check_in_time', dayStart)
      .lte('check_in_time', dayEnd)
      .maybeSingle();

    if (existingLog) {
      return {
        success: true,
        message: 'Already Checked In Today',
        status: existingLog.status as 'present' | 'late',
        checkInTime: existingLog.check_in_time,
        teacherName: effectiveProfile.name,
        teacherEmail: effectiveProfile.email || user.email,
        alreadyCheckedIn: true,
      };
    }

    // Commit check-in record to attendance_logs
    const { data: inserted, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        teacher_id: teacherId,
        check_in_time: now.toISOString(),
        status,
      })
      .select()
      .single();

    if (insertError) {
      // Explicitly catch Postgres 23505 (unique teacher daily attendance constraint)
      if (
        insertError.code === '23505' ||
        String(insertError.code) === '23505' ||
        insertError.message?.includes('23505') ||
        insertError.message?.includes('idx_unique_teacher_daily_attendance')
      ) {
        return {
          success: true,
          message: 'Already Checked In Today',
          status,
          checkInTime: now.toISOString(),
          teacherName: effectiveProfile.name,
          teacherEmail: effectiveProfile.email || user.email,
          alreadyCheckedIn: true,
        };
      }

      console.error('Failed to commit attendance log:', insertError);
      return {
        success: false,
        error: {
          message: insertError.message,
          details: insertError.details || insertError.hint || `Code: ${insertError.code}`,
        },
        details: insertError.details || insertError.hint || `Code: ${insertError.code}`,
      };
    }

    return {
      success: true,
      message: `Check-in recorded successfully. Marked as ${status.toUpperCase()}.`,
      status,
      checkInTime: inserted.check_in_time,
      teacherName: effectiveProfile.name,
      teacherEmail: effectiveProfile.email || user.email,
      alreadyCheckedIn: false,
    };
  } catch (dbErr: any) {
    console.error('Database check-in error:', dbErr);
    return {
      success: false,
      error: {
        message: dbErr?.message || 'Unexpected error processing check-in.',
        details: dbErr?.details || String(dbErr),
      },
    };
  }
}

/**
 * Server Action: Retrieves the currently authenticated staff user for scanner session.
 */
export async function getScannerSessionAction(): Promise<ScannerSession | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, role, shift_start_time, designation')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile || {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Staff Member',
        email: user.email,
        role: 'staff',
        shift_start_time: '08:00:00',
        designation: null,
      },
    };
  } catch (err) {
    console.error('Failed to get scanner session:', err);
    return null;
  }
}
