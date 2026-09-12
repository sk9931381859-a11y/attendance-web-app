'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface StaffMember {
  id: string;
  name: string;
  email?: string | null;
  role: 'staff' | 'admin';
  shift_start_time: string;
  created_at?: string;
}

export interface StaffActionResult {
  success: boolean;
  error?: string;
  staff?: StaffMember;
}

/**
 * Ensures the requesting user is an active admin.
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
 * Server Action: Fetches all staff members from the profiles table.
 */
export async function getStaffListAction(): Promise<StaffMember[]> {
  try {
    await verifyAdminRole();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, shift_start_time, created_at')
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
      shift_start_time: item.shift_start_time || '08:00:00',
      created_at: item.created_at,
    }));
  } catch (err) {
    console.error('Error in getStaffListAction:', err);
    return [];
  }
}

/**
 * Server Action: Creates a new staff member profile entry.
 */
export async function createStaffAction(data: {
  name: string;
  shift_start_time?: string;
  role?: 'staff' | 'admin';
  email?: string;
}): Promise<StaffActionResult> {
  try {
    const { supabase } = await verifyAdminRole();

    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'A valid staff name is required.' };
    }

    const shift_start_time = data.shift_start_time?.trim() || '08:00:00';
    const role = data.role === 'admin' ? 'admin' : 'staff';
    const email = data.email?.trim() || null;

    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        name,
        shift_start_time,
        role,
        email,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create staff profile:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/manage');
    revalidatePath('/dashboard');
    revalidatePath('/scan');

    return {
      success: true,
      staff: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        shift_start_time: created.shift_start_time,
        created_at: created.created_at,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create staff member.',
    };
  }
}

/**
 * Server Action: Updates an existing staff member's name, shift_start_time, and role.
 */
export async function updateStaffAction(data: {
  id: string;
  name: string;
  shift_start_time: string;
  role?: 'staff' | 'admin';
}): Promise<StaffActionResult> {
  try {
    const { supabase } = await verifyAdminRole();

    if (!data.id) {
      return { success: false, error: 'Staff ID is required.' };
    }

    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'A valid staff name is required.' };
    }

    const shift_start_time = data.shift_start_time?.trim() || '08:00:00';
    const role = data.role === 'admin' ? 'admin' : 'staff';

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        name,
        shift_start_time,
        role,
      })
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
        shift_start_time: updated.shift_start_time,
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
    const { supabase, user } = await verifyAdminRole();

    if (!id) {
      return { success: false, error: 'Staff ID is required.' };
    }

    // Prevent admin from deleting their own profile
    if (id === user.id) {
      return { success: false, error: 'You cannot delete your own administrator profile.' };
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete staff profile:', error);
      return { success: false, error: error.message };
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
