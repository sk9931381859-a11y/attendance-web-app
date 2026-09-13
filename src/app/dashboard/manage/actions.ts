'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
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
  company_id?: string | null;
  created_at?: string;
}

export interface AttendanceLogRecord {
  id: string;
  teacher_id: string;
  check_in_time: string;
  status: 'present' | 'late' | 'absent';
  created_at: string;
  company_id?: string | null;
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

export interface RegisterStaffInput {
  name: string;
  email: string;
  password: string;
  designation?: string | null;
  shift_start_time: string;
  salary?: number | string | null;
  working_days?: string[] | null;
}

/**
 * Returns a dedicated Supabase Client using the Service Role Key.
 * CRITICAL: Uses process.env.SUPABASE_SERVICE_ROLE_KEY to call supabase.auth.admin.createUser().
 * This allows the Principal to create new staff accounts without terminating their own active session.
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
 * Uses @supabase/ssr with cookies() to verify the active session,
 * and confirms the caller has role === 'admin' in public.profiles.
 */
async function verifyAdminRole() {
  const cookieStore = cookies();
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  const rawAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!rawUrl || !rawAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key configuration.');
  }

  const supabase = createServerClient(rawUrl, rawAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in server context
        }
      },
    },
  });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  let user = session?.user;
  if (sessionError || !session || !user) {
    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (userData?.user) {
      user = userData.user;
    } else {
      throw new Error('Authentication required.');
    }
  }

  const adminClient = getAdminClient();

  const { data: profile, error: profError } = await adminClient
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', user.id)
    .single();

  if (profError || !profile || profile.role !== 'admin') {
    throw new Error('Unauthorized: Administrator role required.');
  }

  const companyId = profile.company_id || '11111111-1111-1111-1111-111111111111';

  return { supabase, user, profile, companyId, adminClient };
}

/**
 * Normalizes time string to HH:MM:SS format (e.g., '08:00 AM' -> '08:00:00' or '08:00' -> '08:00:00')
 */
function normalizeTime(timeStr?: string): string {
  if (!timeStr) return '08:00:00';
  const trimmed = timeStr.trim();

  // Handle '08:00 AM' / '02:30 PM'
  const ampmMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(trimmed);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const seconds = ampmMatch[3] || '00';
    const ampm = ampmMatch[4]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  }

  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

/**
 * Server Action: Staff Registration Form
 * Captures Name, Email, Temporary Password, Designation, Shift Timings, Salary, Working Days.
 * Initializes Supabase with SUPABASE_SERVICE_ROLE_KEY to call supabase.auth.admin.createUser().
 * Upon successful account creation, inserts the returned user.id into public.profiles with company_id.
 */
export async function registerStaffAction(data: RegisterStaffInput): Promise<StaffActionResult> {
  try {
    // 1. Verify the Caller: Use @supabase/ssr with cookies() from next/headers to verify the active session
    const cookieStore = cookies();
    const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
    const rawAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!rawUrl || !rawAnonKey) {
      throw new Error('Missing Supabase URL or Anon Key configuration.');
    }

    const supabase = createServerClient(rawUrl, rawAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in server context
          }
        },
      },
    });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    let callerUser = session?.user;
    if (sessionError || !session || !callerUser) {
      const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (userData?.user) {
        callerUser = userData.user;
      } else {
        throw new Error('Authentication required.');
      }
    }

    // 2. Instantiate Admin Client: Create a separate supabaseAdmin client using @supabase/supabase-js
    // passing process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!serviceRoleKey) {
      throw new Error('Missing Supabase Service Role Key configuration.');
    }

    const supabaseAdmin = createSupabaseClient(rawUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query profiles to confirm the caller has role === 'admin'. If not, throw an unauthorized error.
    const { data: callerProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', callerUser.id)
      .single();

    if (profileCheckError || !callerProfile || callerProfile.role !== 'admin') {
      throw new Error('Unauthorized: Administrator role required.');
    }

    const companyId = callerProfile.company_id || '11111111-1111-1111-1111-111111111111';

    // 3. Execute Transaction
    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'A valid staff name (minimum 2 characters) is required.' };
    }

    const email = data.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { success: false, error: 'A valid staff email address is required.' };
    }

    const password = data.password?.trim();
    if (!password || password.length < 6) {
      return { success: false, error: 'A temporary password of at least 6 characters is required.' };
    }

    const shift_start_time = normalizeTime(data.shift_start_time);
    const designation = data.designation?.trim() || null;
    const salary = data.salary !== undefined && data.salary !== '' && data.salary !== null ? Number(data.salary) : null;
    const working_days = data.working_days && data.working_days.length > 0
      ? data.working_days
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    // 3a. Use supabaseAdmin.auth.admin.createUser(...) to create the auth account.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'staff',
        designation,
        company_id: companyId,
      },
    });

    if (authError || !authData?.user) {
      if (
        authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists')
      ) {
        return { success: false, error: `A staff account with email "${email}" already exists.` };
      }
      return { success: false, error: authError?.message || 'Failed to create staff authentication account.' };
    }

    // 3b. Extract the returned user.id.
    const newUserId = authData.user.id;

    // 3c. Use the same supabaseAdmin client to insert the new user data
    // (Name, Designation, Shift, Salary, Working Days, and the Principal's company_id)
    // into public.profiles (bypasses RLS safely for this admin action).
    const profilePayload = {
      id: newUserId,
      name,
      email,
      role: 'staff',
      designation,
      shift_start_time,
      salary,
      working_days,
      company_id: companyId,
    };

    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload)
      .select()
      .single();

    if (profileError) {
      console.error('Failed to insert staff profile into public.profiles:', profileError);
      return { success: false, error: `Failed to create staff profile record: ${profileError.message}` };
    }

    revalidatePath('/dashboard/manage');
    revalidatePath('/dashboard');
    revalidatePath('/scan');

    return {
      success: true,
      staff: {
        id: insertedProfile.id,
        name: insertedProfile.name,
        email: insertedProfile.email,
        role: (insertedProfile.role as 'staff' | 'admin') || 'staff',
        designation: insertedProfile.designation,
        shift_start_time: insertedProfile.shift_start_time,
        salary: insertedProfile.salary != null ? Number(insertedProfile.salary) : null,
        working_days: insertedProfile.working_days,
        company_id: insertedProfile.company_id,
        created_at: insertedProfile.created_at,
      },
    };
  } catch (err: unknown) {
    console.error('Error in registerStaffAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during staff registration.',
    };
  }
}

/**
 * Server Action: Fetches all staff members from the profiles table.
 */
export async function getStaffListAction(): Promise<StaffMember[]> {
  try {
    const { companyId } = await verifyAdminRole();
    const adminClient = getAdminClient();

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, name, email, role, designation, shift_start_time, salary, working_days, company_id, created_at')
      .eq('company_id', companyId)
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
      working_days: Array.isArray(item.working_days) ? item.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      company_id: item.company_id,
      created_at: item.created_at,
    }));
  } catch (err) {
    console.error('Error in getStaffListAction:', err);
    return [];
  }
}

/**
 * Server Action: Fetches attendance logs joined with profiles.name.
 * Defaults to created_at >= (NOW() - INTERVAL '3 months').
 * Scoped strictly to the Principal's company_id.
 * Supports dynamic Date Range Picker (startDate to endDate).
 */
export async function getAttendanceLogsAction(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; logs: AttendanceLogRecord[]; error?: string }> {
  try {
    const { companyId } = await verifyAdminRole();
    const adminClient = getAdminClient();

    let query = adminClient
      .from('attendance_logs')
      .select('id, teacher_id, check_in_time, status, created_at, company_id, profiles:teacher_id(name, designation, role)')
      .eq('company_id', companyId)
      .order('check_in_time', { ascending: false });

    if (filters?.startDate) {
      const startIso = new Date(`${filters.startDate}T00:00:00.000Z`).toISOString();
      query = query.gte('check_in_time', startIso);
    } else {
      // Default: created_at >= (NOW() - INTERVAL '3 months')
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      query = query.gte('created_at', threeMonthsAgo.toISOString());
    }

    if (filters?.endDate) {
      const endIso = new Date(`${filters.endDate}T23:59:59.999Z`).toISOString();
      query = query.lte('check_in_time', endIso);
    }

    query = query.limit(300);

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
      company_id: item.company_id,
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

/**
 * Server Action: Updates an existing staff member's profile.
 * Scoped to organization company_id.
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
    const { companyId } = await verifyAdminRole();
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
      .eq('company_id', companyId)
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
        company_id: updated.company_id,
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
 * Server Action: Deletes a staff member profile scoped to company_id.
 */
export async function deleteStaffAction(id: string): Promise<StaffActionResult> {
  try {
    const { user, companyId } = await verifyAdminRole();
    const adminClient = getAdminClient();

    if (!id) {
      return { success: false, error: 'Staff ID is required.' };
    }

    if (id === user.id) {
      return { success: false, error: 'You cannot delete your own administrator profile.' };
    }

    const { error } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Failed to delete staff profile:', error);
      return { success: false, error: error.message };
    }

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
