'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { TeacherAllocation } from '@/types/supabase';

export interface AvailableFaculty {
  id: string;
  name: string;
  email?: string | null;
  designation?: string | null;
  role: string;
  school_id?: string | null;
}

/**
 * Service role Supabase client helper to bypass RLS for administrative actions.
 */
function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Fetch all available staff faculty registered under the Admin's school.
 * Queries `profiles` where `role = 'staff'` and `school_id` matches the current session tenant.
 * Uses admin client fallback to ensure complete visibility without RLS session desynchronization.
 */
export async function fetchAvailableFaculty(): Promise<{
  success: boolean;
  data: AvailableFaculty[];
  error?: string;
}> {
  try {
    const supabase = createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, data: [], error: 'Unauthorized: Please sign in.' };
    }

    // 2. Resolve admin school_id & company_id
    const { data: adminProf } = await supabase
      .from('profiles')
      .select('id, role, school_id, company_id')
      .eq('id', user.id)
      .maybeSingle();

    const activeSchoolId =
      adminProf?.school_id ||
      (user.app_metadata as any)?.school_id ||
      (user.user_metadata as any)?.school_id ||
      '11111111-1111-1111-1111-111111111111';

    const adminClient = getAdminClient();
    const client = adminClient || supabase;

    // 3. Query profiles where role = 'staff' and school_id matches tenant
    const { data: staffProfiles, error: staffErr } = await client
      .from('profiles')
      .select('id, name, email, role, designation, school_id')
      .eq('role', 'staff')
      .eq('school_id', activeSchoolId)
      .order('name', { ascending: true });

    if (staffErr) {
      console.error('Error fetching available faculty:', staffErr);
      return { success: false, data: [], error: staffErr.message };
    }

    let finalStaff = staffProfiles || [];

    // Fallback: If 0 staff found under school_id, check company_id to bridge legacy records
    if (finalStaff.length === 0 && adminProf?.company_id) {
      const { data: fallbackProfiles } = await client
        .from('profiles')
        .select('id, name, email, role, designation, school_id')
        .eq('role', 'staff')
        .eq('company_id', adminProf.company_id)
        .order('name', { ascending: true });

      if (fallbackProfiles && fallbackProfiles.length > 0) {
        finalStaff = fallbackProfiles;
      }
    }

    return {
      success: true,
      data: finalStaff as AvailableFaculty[],
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchAvailableFaculty:', err);
    return {
      success: false,
      data: [],
      error: err.message || 'Failed to fetch faculty.',
    };
  }
}

/**
 * Assign a faculty member to a subject allocation.
 * Executes an INSERT into `teacher_allocations` mapping `school_id`, `teacher_id`, and `subject_id`.
 */
export async function assignFaculty(
  subjectId: string,
  teacherId: string
): Promise<{
  success: boolean;
  allocation?: TeacherAllocation;
  error?: string;
}> {
  try {
    const supabase = createClient();

    // 1. Authenticate user & ensure Admin
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'Unauthorized: Please sign in.' };
    }

    // 2. Resolve admin profile & school_id
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = (user.app_metadata as any)?.role || adminProfile?.role || 'staff';
    if (userRole !== 'admin') {
      return { success: false, error: 'Forbidden: Only administrators can assign faculty.' };
    }

    // 3. Get subject details to verify class and tenant school_id
    const { data: subject } = await supabase
      .from('academic_subjects')
      .select('id, class_id, school_id')
      .eq('id', subjectId)
      .maybeSingle();

    if (!subject) {
      return { success: false, error: 'Target academic subject was not found.' };
    }

    const schoolId =
      subject.school_id ||
      adminProfile?.school_id ||
      (user.app_metadata as any)?.school_id ||
      '11111111-1111-1111-1111-111111111111';

    const adminClient = getAdminClient();
    const mutClient = adminClient || supabase;

    // 4. Remove any previous allocation for this subject to prevent stale links
    const { error: deleteErr } = await mutClient
      .from('teacher_allocations')
      .delete()
      .eq('subject_id', subjectId);

    if (deleteErr) {
      console.warn('Warning removing prior allocation:', deleteErr);
    }

    // 5. Execute INSERT into teacher_allocations mapping school_id, teacher_id, subject_id, and staff_id
    const { data: newAllocation, error: insertErr } = await mutClient
      .from('teacher_allocations')
      .insert([
        {
          school_id: schoolId,
          teacher_id: teacherId,
          staff_id: teacherId,
          subject_id: subjectId,
          class_id: subject.class_id || null,
          is_class_teacher: false,
        },
      ])
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting teacher allocation:', insertErr);
      return { success: false, error: insertErr.message || 'Database insert failed.' };
    }

    // Ensure teacher profile school_id is synchronized with this school
    if (adminClient) {
      await adminClient
        .from('profiles')
        .update({ school_id: schoolId })
        .eq('id', teacherId);

      try {
        await adminClient.auth.admin.updateUserById(teacherId, {
          app_metadata: { school_id: schoolId, role: 'staff' },
        });
      } catch (metaErr) {
        console.warn('Could not sync app_metadata during faculty assignment:', metaErr);
      }
    }

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/oversight');
    revalidatePath('/faculty/syllabus');

    return { success: true, allocation: newAllocation as TeacherAllocation };
  } catch (err: any) {
    console.error('Unexpected error in assignFaculty:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while assigning faculty.',
    };
  }
}

/**
 * Remove an existing faculty assignment from a subject.
 */
export async function unassignFaculty(subjectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const adminClient = getAdminClient();
    const client = adminClient || supabase;

    const { error: deleteErr } = await client
      .from('teacher_allocations')
      .delete()
      .eq('subject_id', subjectId);

    if (deleteErr) {
      console.error('Error unassigning faculty:', deleteErr);
      return { success: false, error: deleteErr.message };
    }

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/oversight');
    revalidatePath('/faculty/syllabus');

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in unassignFaculty:', err);
    return {
      success: false,
      error: err.message || 'Failed to unassign faculty.',
    };
  }
}
