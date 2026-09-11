'use server';

import { createClient } from '@/lib/supabase/server';
import { calculateHaversineDistance, FALLBACK_TEST_STAFF_ID } from '@/lib/geo';
import { verifyKioskToken } from '@/lib/totp';

const BUILDING_LAT = parseFloat(process.env.BUILDING_LATITUDE || '22.8046');
const BUILDING_LON = parseFloat(process.env.BUILDING_LONGITUDE || '86.2029');
const ACCEPTABLE_RADIUS_METERS = parseFloat(process.env.ACCEPTABLE_RADIUS_METERS || '100');
const ON_TIME_GRACE_MINUTES = 10;

export interface CheckInPayload {
  teacherId?: string;
  latitude: number;
  longitude: number;
  token?: string;
  bypassGeofence?: boolean;
}

export interface CheckInResponse {
  success: boolean;
  message?: string;
  distanceMeters?: number;
  status?: 'present' | 'late';
  checkInTime?: string;
  teacherName?: string;
  error?: string;
  detectedCoords?: { latitude: number; longitude: number };
  targetBuildingCoords?: { latitude: number; longitude: number };
}

/**
 * Server Action: Fetches all registered staff profiles for teacher selection.
 */
export async function getStaffProfilesAction() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, shift_start_time')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching staff profiles:', error);
      return [
        {
          id: FALLBACK_TEST_STAFF_ID,
          name: 'Test Staff Member (Fallback)',
          shift_start_time: '08:00:00',
        },
      ];
    }

    if (!data || data.length === 0) {
      return [
        {
          id: FALLBACK_TEST_STAFF_ID,
          name: 'Test Staff Member (Fallback)',
          shift_start_time: '08:00:00',
        },
      ];
    }

    return data;
  } catch (err) {
    console.error('Failed to get staff profiles:', err);
    return [
      {
        id: FALLBACK_TEST_STAFF_ID,
        name: 'Test Staff Member (Fallback)',
        shift_start_time: '08:00:00',
      },
    ];
  }
}

/**
 * Server Action: Submits check-in by invoking the Supabase Edge Function
 * with a reliable in-app fallback.
 */
export async function submitCheckInAction(payload: CheckInPayload): Promise<CheckInResponse> {
  const { latitude, longitude, token, bypassGeofence } = payload;
  const teacherId = payload.teacherId || FALLBACK_TEST_STAFF_ID;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { success: false, error: 'Valid GPS coordinates are required.' };
  }

  // 1. Calculate Haversine distance
  // Correct parameter mapping: (lat1=latitude, lon1=longitude, lat2=BUILDING_LAT, lon2=BUILDING_LON)
  const distance = calculateHaversineDistance(latitude, longitude, BUILDING_LAT, BUILDING_LON);
  const roundedDist = Math.round(distance);

  // 2. Attempt invocation of Supabase Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('placeholder')) {
    try {
      const edgeUrl = `${supabaseUrl}/functions/v1/verify-attendance`;
      const edgeRes = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          teacher_id: teacherId,
          token,
          test_mode: bypassGeofence === true,
          bypass_geofence: bypassGeofence === true,
        }),
      });

      if (edgeRes.ok) {
        const data = await edgeRes.json();
        return {
          success: true,
          message: data.message || 'Check-in recorded successfully.',
          distanceMeters: data.data?.distanceMeters ?? roundedDist,
          status: data.data?.status,
          checkInTime: data.data?.checkInTime,
          teacherName: data.data?.teacherName,
          detectedCoords: { latitude, longitude },
          targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
        };
      } else if (edgeRes.status === 403 || edgeRes.status === 409 || edgeRes.status === 400) {
        const errData = await edgeRes.json().catch(() => ({}));
        return {
          success: false,
          error: errData.error || `Check-in rejected (${edgeRes.status}).`,
          distanceMeters: errData.distanceMeters ?? roundedDist,
          detectedCoords: { latitude, longitude },
          targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
        };
      }
    } catch (edgeErr) {
      console.warn('Direct Edge Function invocation unavailable, executing server fallback:', edgeErr);
    }
  }

  // 3. Server-side Geofencing Validation Fallback
  if (!bypassGeofence && distance > ACCEPTABLE_RADIUS_METERS) {
    return {
      success: false,
      error: `Geofence violation: You are ${roundedDist}m away from the campus. Maximum allowed distance is ${ACCEPTABLE_RADIUS_METERS}m.`,
      distanceMeters: roundedDist,
      detectedCoords: { latitude, longitude },
      targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
    };
  }

  // 4. Verify TOTP token if provided
  if (token) {
    let cleanToken = token;
    try {
      if (token.startsWith('{')) {
        const parsed = JSON.parse(token);
        if (parsed.token) cleanToken = parsed.token;
      }
    } catch {}

    const isValidToken = verifyKioskToken(cleanToken);
    if (!isValidToken && !bypassGeofence) {
      return {
        success: false,
        error: 'QR Code expired or invalid. Please scan the active kiosk screen.',
        distanceMeters: roundedDist,
        detectedCoords: { latitude, longitude },
        targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
      };
    }
  }

  // 5. Database verification & commit via Supabase client
  try {
    const supabase = createClient();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dayStart = `${todayStr}T00:00:00.000Z`;
    const dayEnd = `${todayStr}T23:59:59.999Z`;

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
        success: false,
        error: 'Attendance already recorded for today.',
        status: existingLog.status as 'present' | 'late',
        checkInTime: existingLog.check_in_time,
        distanceMeters: roundedDist,
        detectedCoords: { latitude, longitude },
        targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
      };
    }

    // Lookup profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, name, shift_start_time')
      .eq('id', teacherId)
      .maybeSingle();

    if (!profile && teacherId === FALLBACK_TEST_STAFF_ID) {
      profile = {
        id: FALLBACK_TEST_STAFF_ID,
        name: 'Test Staff Member',
        shift_start_time: '08:00:00',
      };
    }

    if (!profile) {
      return {
        success: false,
        error: 'Teacher profile not found.',
        detectedCoords: { latitude, longitude },
        targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
      };
    }

    // Determine status (present vs late)
    let status: 'present' | 'late' = 'present';
    if (profile.shift_start_time) {
      const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(profile.shift_start_time);
      if (match) {
        const shiftDate = new Date(now);
        shiftDate.setHours(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] || '0', 10), 0);
        const graceMs = ON_TIME_GRACE_MINUTES * 60 * 1000;
        if (now.getTime() > shiftDate.getTime() + graceMs) {
          status = 'late';
        }
      }
    }

    // Insert attendance log
    const { data: inserted, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        teacher_id: profile.id,
        check_in_time: now.toISOString(),
        status,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to commit attendance log:', insertError);
      return {
        success: false,
        error: 'Database error writing attendance log.',
        detectedCoords: { latitude, longitude },
        targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
      };
    }

    return {
      success: true,
      message: `Check-in verified. Marked as ${status.toUpperCase()}.${bypassGeofence ? ' (Dev/Test Mode Bypass Active)' : ''}`,
      status,
      checkInTime: inserted.check_in_time,
      teacherName: profile.name,
      distanceMeters: roundedDist,
      detectedCoords: { latitude, longitude },
      targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
    };
  } catch (dbErr) {
    console.error('Database check-in error:', dbErr);
    return {
      success: false,
      error: 'Unexpected error processing check-in.',
      detectedCoords: { latitude, longitude },
      targetBuildingCoords: { latitude: BUILDING_LAT, longitude: BUILDING_LON },
    };
  }
}
