'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Profile, TeacherAllocation } from '@/types/supabase';

export interface AvailableFaculty {
  id: string;
  name: string;
  email?: string | null;
  designation?: string | null;
  role: string;
  school_id?: string | null;
}

/**
 * Fetch all available staff faculty registered under the Admin's school.
 * Strictly queries `profiles` where `role = 'staff'` and `school_id` matches the current session tenant.
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

    // 2. Resolve admin school_id
    const jwtSchoolId =
      (user.app_metadata as any)?.school_id ||
      (user.user_metadata as any)?.school_id;

    let activeSchoolId = jwtSchoolId;
    if (!activeSchoolId) {
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();
      activeSchoolId = adminProf?.school_id || '11111111-1111-1111-1111-111111111111';
    }

    // 3. Query profiles where role = 'staff' and school_id matches tenant
    const { data: staffProfiles, error: staffErr } = await supabase
      .from('profiles')
      .select('id, name, email, role, designation, school_id')
      .eq('role', 'staff')
      .eq('school_id', activeSchoolId)
      .order('name', { ascending: true });

    if (staffErr) {
      console.error('Error fetching available faculty:', staffErr);
      return { success: false, data: [], error: staffErr.message };
    }

    return {
      success: true,
      data: (staffProfiles || []) as AvailableFaculty[],
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

    const schoolId =
      adminProfile?.school_id ||
      (user.app_metadata as any)?.school_id ||
      '11111111-1111-1111-1111-111111111111';

    // 3. Get subject details to preserve class_id if present
    const { data: subject } = await supabase
      .from('academic_subjects')
      .select('id, class_id')
      .eq('id', subjectId)
      .maybeSingle();

    // 4. Remove any previous allocation for this subject to prevent stale links
    const { error: deleteErr } = await supabase
      .from('teacher_allocations')
      .delete()
      .eq('subject_id', subjectId);

    if (deleteErr) {
      console.warn('Warning removing prior allocation:', deleteErr);
    }

    // 5. Execute INSERT into teacher_allocations mapping school_id, teacher_id, subject_id, and staff_id
    const { data: newAllocation, error: insertErr } = await supabase
      .from('teacher_allocations')
      .insert([
        {
          school_id: schoolId,
          teacher_id: teacherId,
          staff_id: teacherId,
          subject_id: subjectId,
          class_id: subject?.class_id || null,
        },
      ])
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting teacher allocation:', insertErr);
      return { success: false, error: insertErr.message || 'Database insert failed.' };
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

    const { error: deleteErr } = await supabase
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
