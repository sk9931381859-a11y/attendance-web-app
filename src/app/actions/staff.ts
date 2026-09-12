'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export interface StaffMember {
  id: string;
  name: string;
  email?: string | null;
  role: 'staff' | 'admin';
  designation?: string | null;
  shift_start_time: string;
  salary?: number | null;
  working_days?: string[] | null;
  created_at?: string;
}

export interface AttendanceLogRecord {
  id: string;
  teacher_id: string;
  check_in_time: string;
  status: 'present' | 'late' | 'absent';
  created_at: string;
  profiles?: {
    name: string;
    designation?: string | null;
    role?: string;
  } | null;
}

export interface StaffActionResult {
  success: boolean;
  error?: string;
  staff?: StaffMember;
  generatedPassword?: string;
}

/**
 * Returns a dedicated Supabase Client using the Service Role Key.
 * CRITICAL: This allows administrator operations (e.g. auth.admin.createUser)
 * without terminating or overwriting the Principal's active browser session.
 */
function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase Service Role Key or URL configuration.');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Ensures the requesting user is an active administrator.
 */
async function verifyAdminRole() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Authentication required.');
  }

  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profError || profile?.role !== 'admin') {
    throw new Error('Unauthorized: Administrator role required.');
  }

  return { supabase, user };
}

/**
 * Normalizes time string to HH:MM:SS format
 */
function normalizeTime(timeStr?: string): string {
  if (!timeStr) return '08:00:00';
  const trimmed = timeStr.trim();
  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

/**
 * Server Action: Fetches all staff members from the profiles table.
 */
export async function getStaffListAction(): Promise<StaffMember[]> {
  try {
    await verifyAdminRole();
    const adminClient = getAdminClient();

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, name, email, role, designation, shift_start_time, salary, working_days, created_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching staff list:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: (item.role as 'staff' | 'admin') || 'staff',
      designation: item.designation,
      shift_start_time: item.shift_start_time || '08:00:00',
      salary: item.salary != null ? Number(item.salary) : null,
      working_days: Array.isArray(item.working_days) ? item.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      created_at: item.created_at,
    }));
  } catch (err) {
    console.error('Error in getStaffListAction:', err);
    return [];
  }
}

/**
/**
 * Server Action: Direct Staff Profile Creation into public.profiles.
 * Inserts real staff data (Name, Designation, Shift Time, Salary, Working Days, optional Email & Role).
 * If email is provided, optionally provisions an auth user so they can log in.
 */
export async function createStaffAction(data: {
  name: string;
  designation?: string | null;
  shift_start_time: string;
  salary?: number | string | null;
  working_days?: string[] | null;
  role?: 'staff' | 'admin';
  email?: string | null;
  password?: string | null;
}): Promise<StaffActionResult> {
  try {
    await verifyAdminRole();
    const adminClient = getAdminClient();

    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'A valid staff name (minimum 2 characters) is required.' };
    }

    const shift_start_time = normalizeTime(data.shift_start_time);
    const role = data.role === 'admin' ? 'admin' : 'staff';
    const designation = data.designation?.trim() || null;
    const salary = data.salary !== undefined && data.salary !== '' && data.salary !== null ? Number(data.salary) : null;
    const working_days = data.working_days && data.working_days.length > 0
      ? data.working_days
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const email = data.email?.trim().toLowerCase() || null;
    let userId: string | undefined = undefined;
    let generatedPassword: string | undefined = undefined;

    // If an email address is provided, provision auth user so staff can log in
    if (email && email.includes('@')) {
      generatedPassword = data.password?.trim() || `Staff${Math.floor(100000 + Math.random() * 900000)}!`;
      try {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: {
            name,
            role,
            designation,
          },
        });

        if (!authError && authData?.user) {
          userId = authData.user.id;
        } else if (authError) {
          // If auth user already exists, check if profile already exists
          if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already exists')) {
            const { data: existingUser } = await adminClient
              .from('profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (existingUser) {
              return { success: false, error: `A staff member with email "${email}" already exists.` };
            }
          } else {
            console.warn('Auth user creation notice:', authError.message);
          }
        }
      } catch (authErr) {
        console.warn('Error creating auth user, proceeding with direct profile insert:', authErr);
      }
    }

    // Direct insert into public.profiles
    const insertPayload: Record<string, any> = {
      name,
      shift_start_time,
      role,
      designation,
      salary,
      working_days,
    };

    if (userId) {
      insertPayload.id = userId;
    }
    if (email) {
      insertPayload.email = email;
    }

    let profile: any;
    if (userId) {
      // Auth trigger already created a skeleton profile, update/upsert with full staff data
      const { data: upsertedProfile, error: profileError } = await adminClient
        .from('profiles')
        .upsert(insertPayload)
        .select()
        .single();

      if (profileError) {
        console.error('Failed to upsert staff profile into public.profiles:', profileError);
        return { success: false, error: `Database save failed: ${profileError.message}` };
      }
      profile = upsertedProfile;
    } else {
      // Direct insert into public.profiles
      const { data: insertedProfile, error: profileError } = await adminClient
        .from('profiles')
        .insert(insertPayload)
        .select()
        .single();

      if (profileError) {
        console.error('Failed to insert staff profile into public.profiles:', profileError);
        return { success: false, error: `Database insert failed: ${profileError.message}` };
      }
      profile = insertedProfile;
    }

    revalidatePath('/dashboard/manage');
    revalidatePath('/dashboard');
    revalidatePath('/scan');

    return {
      success: true,
      generatedPassword,
      staff: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: (profile.role as 'staff' | 'admin') || 'staff',
        designation: profile.designation,
        shift_start_time: profile.shift_start_time,
        salary: profile.salary != null ? Number(profile.salary) : null,
        working_days: profile.working_days,
        created_at: profile.created_at,
      },
    };
  } catch (err: unknown) {
    console.error('Error in createStaffAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during staff registration.',
    };
  }
}

/**
 * Backwards compatibility alias for registerStaffAction
 */
export const registerStaffAction = createStaffAction;

/**
 * Server Action: Updates an existing staff member's profile.
 */
export async function updateStaffAction(data: {
  id: string;
  name: string;
  shift_start_time: string;
  role?: 'staff' | 'admin';
  designation?: string | null;
  salary?: number | string | null;
  working_days?: string[] | null;
  email?: string | null;
}): Promise<StaffActionResult> {
  try {
    await verifyAdminRole();
    const adminClient = getAdminClient();

    if (!data.id) {
      return { success: false, error: 'Staff ID is required.' };
    }

    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'A valid staff name is required.' };
    }

    const shift_start_time = normalizeTime(data.shift_start_time);
    const role = data.role === 'admin' ? 'admin' : 'staff';
    const designation = data.designation !== undefined ? (data.designation?.trim() || null) : undefined;
    const salary = data.salary !== undefined && data.salary !== '' && data.salary !== null ? Number(data.salary) : null;
    const working_days = data.working_days;
    const email = data.email !== undefined ? (data.email?.trim().toLowerCase() || null) : undefined;

    const updatePayload: Record<string, any> = {
      name,
      shift_start_time,
      role,
    };

    if (designation !== undefined) updatePayload.designation = designation;
    if (data.salary !== undefined) updatePayload.salary = salary;
    if (working_days !== undefined) updatePayload.working_days = working_days;
    if (email !== undefined) updatePayload.email = email;

    const { data: updated, error } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update staff profile:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/manage');
    revalidatePath('/dashboard');
    revalidatePath('/scan');

    return {
      success: true,
      staff: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        designation: updated.designation,
        shift_start_time: updated.shift_start_time,
        salary: updated.salary != null ? Number(updated.salary) : null,
        working_days: updated.working_days,
        created_at: updated.created_at,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update staff member.',
    };
  }
}

/**
 * Server Action: Deletes a staff member profile (cascading to attendance_logs).
 */
export async function deleteStaffAction(id: string): Promise<StaffActionResult> {
  try {
    const { user } = await verifyAdminRole();
    const adminClient = getAdminClient();

    if (!id) {
      return { success: false, error: 'Staff ID is required.' };
    }

    // Prevent admin from deleting their own profile
    if (id === user.id) {
      return { success: false, error: 'You cannot delete your own administrator profile.' };
    }

    // Delete from profiles
    const { error } = await adminClient.from('profiles').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete staff profile:', error);
      return { success: false, error: error.message };
    }

    // Optionally delete from auth if user exists
    try {
      await adminClient.auth.admin.deleteUser(id);
    } catch {
      // Ignored if user only existed in profiles table
    }

    revalidatePath('/dashboard/manage');
    revalidatePath('/dashboard');
    revalidatePath('/scan');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete staff member.',
    };
  }
}

/**
 * Server Action: Fetches attendance logs joined with profiles.
 * Defaults to created_at >= (NOW() - INTERVAL '3 months').
 * Supports custom startDate and endDate filters.
 */
export async function getAttendanceLogsAction(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; logs: AttendanceLogRecord[]; error?: string }> {
  try {
    await verifyAdminRole();
    const adminClient = getAdminClient();

    let query = adminClient
      .from('attendance_logs')
      .select('id, teacher_id, check_in_time, status, created_at, profiles:teacher_id(name, designation, role)')
      .order('check_in_time', { ascending: false });

    if (filters?.startDate) {
      // Start of day in UTC or specified ISO
      const startIso = new Date(`${filters.startDate}T00:00:00.000Z`).toISOString();
      query = query.gte('check_in_time', startIso);
    } else {
      // Default to 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      query = query.gte('created_at', threeMonthsAgo.toISOString());
    }

    if (filters?.endDate) {
      // End of day in UTC
      const endIso = new Date(`${filters.endDate}T23:59:59.999Z`).toISOString();
      query = query.lte('check_in_time', endIso);
    }

    // Limit to 200 logs for fast rendering and bandwidth efficiency
    query = query.limit(200);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance logs:', error);
      return { success: false, logs: [], error: error.message };
    }

    const logs: AttendanceLogRecord[] = (data || []).map((item: any) => ({
      id: item.id,
      teacher_id: item.teacher_id,
      check_in_time: item.check_in_time,
      status: item.status as 'present' | 'late' | 'absent',
      created_at: item.created_at,
      profiles: item.profiles ? {
        name: item.profiles.name || 'Unknown Staff',
        designation: item.profiles.designation || null,
        role: item.profiles.role || 'staff',
      } : null,
    }));

    return { success: true, logs };
  } catch (err: unknown) {
    console.error('Error in getAttendanceLogsAction:', err);
    return {
      success: false,
      logs: [],
      error: err instanceof Error ? err.message : 'Failed to fetch attendance logs.',
    };
  }
}
