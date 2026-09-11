// ==============================================================================
// Supabase Edge Function: verify-attendance
// Purpose: Geofencing verification & attendance check-in commit
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Facility perimeter defaults (Campus coordinates)
const BUILDING_LATITUDE = parseFloat(Deno.env.get("BUILDING_LATITUDE") || "22.8046");
const BUILDING_LONGITUDE = parseFloat(Deno.env.get("BUILDING_LONGITUDE") || "86.2029");
const ACCEPTABLE_RADIUS_METERS = parseFloat(Deno.env.get("ACCEPTABLE_RADIUS_METERS") || "100");
const ON_TIME_GRACE_MINUTES = 10;
const FALLBACK_TEST_STAFF_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Calculates distance between two GPS coordinates using the Haversine formula
 * @param lat1 Latitude of point 1 (User device)
 * @param lon1 Longitude of point 1 (User device)
 * @param lat2 Latitude of point 2 (Target building)
 * @param lon2 Longitude of point 2 (Target building)
 * @returns Distance in meters
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parses time string (e.g. '08:00:00') against current date to evaluate lateness
 */
function isTeacherLate(shiftStartTimeStr: string | null, checkInDate: Date): boolean {
  if (!shiftStartTimeStr) return false;

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(shiftStartTimeStr);
  if (!match) return false;

  const shiftDate = new Date(checkInDate);
  shiftDate.setHours(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] || "0", 10), 0);

  const graceMs = ON_TIME_GRACE_MINUTES * 60 * 1000;
  return checkInDate.getTime() > shiftDate.getTime() + graceMs;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Edge Function configuration error: Supabase credentials missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse request body
    const body = await req.json();
    const {
      latitude,
      longitude,
      teacher_id,
      token,
      test_mode,
      bypass_geofence,
    } = body;

    // Validate coordinates
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates: latitude and longitude must be finite numbers." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default to fallback test staff ID if teacher_id is absent
    const targetTeacherId = teacher_id || FALLBACK_TEST_STAFF_ID;
    const isTestMode = test_mode === true || bypass_geofence === true;

    // 1. Calculate Geofence Distance using Haversine formula
    // Verified mapping: (lat1=latitude, lon1=longitude, lat2=BUILDING_LATITUDE, lon2=BUILDING_LONGITUDE)
    const distanceMeters = calculateHaversineDistance(
      latitude,
      longitude,
      BUILDING_LATITUDE,
      BUILDING_LONGITUDE
    );

    const roundedDistance = Math.round(distanceMeters);

    // 2. Geofence Boundary Enforcement (Bypassed if test_mode is enabled)
    if (!isTestMode && distanceMeters > ACCEPTABLE_RADIUS_METERS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Geofence violation: Device is ${roundedDistance}m away from facility. Maximum allowed radius is ${ACCEPTABLE_RADIUS_METERS}m.`,
          distanceMeters: roundedDistance,
          maxRadiusMeters: ACCEPTABLE_RADIUS_METERS,
          detectedCoords: { latitude, longitude },
          targetBuildingCoords: { latitude: BUILDING_LATITUDE, longitude: BUILDING_LONGITUDE },
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Prevent duplicate check-ins for the current day
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const dayStart = `${todayStr}T00:00:00.000Z`;
    const dayEnd = `${todayStr}T23:59:59.999Z`;

    const { data: existingLog, error: checkError } = await supabase
      .from("attendance_logs")
      .select("id, check_in_time, status")
      .eq("teacher_id", targetTeacherId)
      .gte("check_in_time", dayStart)
      .lte("check_in_time", dayEnd)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing logs:", checkError);
      return new Response(
        JSON.stringify({ error: "Database error verifying existing check-in records." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingLog) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Attendance already recorded for today.",
          existingRecord: existingLog,
          distanceMeters: roundedDistance,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Retrieve teacher's profile for shift start time
    let { data: profile } = await supabase
      .from("profiles")
      .select("id, name, shift_start_time")
      .eq("id", targetTeacherId)
      .maybeSingle();

    // Auto-provision test profile if using fallback test ID
    if (!profile && targetTeacherId === FALLBACK_TEST_STAFF_ID) {
      const { data: newTestProfile } = await supabase
        .from("profiles")
        .insert({
          id: FALLBACK_TEST_STAFF_ID,
          name: "Test Staff Member",
          shift_start_time: "08:00:00",
        })
        .select()
        .single();
      profile = newTestProfile;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: `Teacher profile not found for ID: ${targetTeacherId}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Determine attendance status: present vs late
    const isLate = isTeacherLate(profile.shift_start_time, now);
    const status = isLate ? "late" : "present";

    // 6. Commit record to attendance_logs
    const { data: insertedLog, error: insertError } = await supabase
      .from("attendance_logs")
      .insert({
        teacher_id: profile.id,
        check_in_time: now.toISOString(),
        status,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting attendance log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record check-in in database." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Attendance verified. Marked as ${status.toUpperCase()}.${isTestMode ? " (Test Mode Bypass Active)" : ""}`,
        data: {
          attendanceId: insertedLog.id,
          teacherId: profile.id,
          teacherName: profile.name,
          status,
          checkInTime: insertedLog.check_in_time,
          distanceMeters: roundedDistance,
          acceptableRadiusMeters: ACCEPTABLE_RADIUS_METERS,
          isTestMode,
          detectedCoords: { latitude, longitude },
          targetBuildingCoords: { latitude: BUILDING_LATITUDE, longitude: BUILDING_LONGITUDE },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Unhandled Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
