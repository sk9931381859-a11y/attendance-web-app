'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { AcademicClass, Student } from '@/types/supabase';

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
 * Resolve current active school_id and company_id for the authenticated user.
 */
async function resolveCurrentTenant(): Promise<{
  userId: string;
  role: string;
  schoolId: string;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { userId: '', role: '', schoolId: '', error: 'Unauthorized: Please sign in.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id, company_id')
    .eq('id', user.id)
    .maybeSingle();

  const role = (user.app_metadata as any)?.role || profile?.role || 'staff';
  const schoolId =
    profile?.school_id ||
    (user.app_metadata as any)?.school_id ||
    (user.user_metadata as any)?.school_id ||
    '11111111-1111-1111-1111-111111111111';

  return { userId: user.id, role, schoolId };
}

/**
 * Pull all classes for the Admin's school_id to populate a class selector dropdown.
 */
export async function fetchClasses(): Promise<{
  success: boolean;
  data: AcademicClass[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    const tenant = await resolveCurrentTenant();
    if (tenant.error) {
      return { success: false, data: [], error: tenant.error };
    }

    const adminClient = getAdminClient();
    const client = adminClient || supabase;

    const { data: classes, error: classErr } = await client
      .from('academic_classes')
      .select('id, school_id, name, grade, section, created_at')
      .eq('school_id', tenant.schoolId)
      .order('name', { ascending: true });

    if (classErr) {
      console.error('Error in fetchClasses:', classErr);
      return { success: false, data: [], error: classErr.message };
    }

    return {
      success: true,
      data: (classes || []) as AcademicClass[],
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchClasses:', err);
    return {
      success: false,
      data: [],
      error: err.message || 'Failed to fetch academic classes.',
    };
  }
}

/**
 * Pull all students assigned to the selected class, ordered by roll_number.
 */
export async function fetchStudents(classId: string): Promise<{
  success: boolean;
  data: Student[];
  error?: string;
}> {
  try {
    if (!classId) {
      return { success: false, data: [], error: 'Class ID is required.' };
    }

    const supabase = createClient();
    const tenant = await resolveCurrentTenant();
    if (tenant.error) {
      return { success: false, data: [], error: tenant.error };
    }

    const adminClient = getAdminClient();
    const client = adminClient || supabase;

    const { data: students, error: studentErr } = await client
      .from('students')
      .select('id, school_id, class_id, name, roll_number, parent_whatsapp, created_at')
      .eq('class_id', classId)
      .eq('school_id', tenant.schoolId)
      .order('roll_number', { ascending: true });

    if (studentErr) {
      console.error('Error in fetchStudents:', studentErr);
      return { success: false, data: [], error: studentErr.message };
    }

    return {
      success: true,
      data: (students || []) as Student[],
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchStudents:', err);
    return {
      success: false,
      data: [],
      error: err.message || 'Failed to fetch student roster.',
    };
  }
}

/**
 * Insert a new student into the specified class.
 * Handles unique roll_number constraint violations gracefully.
 */
export async function addStudent(
  classId: string,
  name: string,
  rollNumber: number,
  phone: string
): Promise<{
  success: boolean;
  student?: Student;
  error?: string;
}> {
  try {
    const trimmedName = (name || '').trim();
    if (!classId) {
      return { success: false, error: 'Please select an academic class.' };
    }
    if (!trimmedName) {
      return { success: false, error: 'Student name is required.' };
    }

    const parsedRoll = Number(rollNumber);
    if (!Number.isInteger(parsedRoll) || parsedRoll <= 0) {
      return { success: false, error: 'Roll number must be a valid positive integer.' };
    }

    // Sanitize phone: remove +, spaces, hyphens, parens
    const cleanPhone = (phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (!cleanPhone || !/^[0-9]{10,15}$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'Please enter a valid WhatsApp phone number with country code (e.g., 919876543210).',
      };
    }

    const supabase = createClient();
    const tenant = await resolveCurrentTenant();
    if (tenant.error) {
      return { success: false, error: tenant.error };
    }

    if (tenant.role !== 'admin') {
      return { success: false, error: 'Forbidden: Only administrators can enroll students.' };
    }

    const adminClient = getAdminClient();
    const client = adminClient || supabase;

    // Verify class exists and belongs to this school
    const { data: classRecord } = await client
      .from('academic_classes')
      .select('id, school_id, name')
      .eq('id', classId)
      .eq('school_id', tenant.schoolId)
      .maybeSingle();

    if (!classRecord) {
      return { success: false, error: 'Academic class not found for this institution.' };
    }

    const { data: newStudent, error: insertErr } = await client
      .from('students')
      .insert([
        {
          school_id: tenant.schoolId,
          class_id: classId,
          name: trimmedName,
          roll_number: parsedRoll,
          parent_whatsapp: cleanPhone,
        },
      ])
      .select('id, school_id, class_id, name, roll_number, parent_whatsapp, created_at')
      .single();

    if (insertErr) {
      // Gracefully handle unique roll number constraint violation
      if (
        insertErr.code === '23505' ||
        insertErr.message?.includes('uq_students_class_roll') ||
        insertErr.message?.includes('roll_number')
      ) {
        return {
          success: false,
          error: `Roll ${parsedRoll} already exists in ${classRecord.name || 'this class'}. Please assign a unique roll number.`,
        };
      }

      console.error('Error inserting student:', insertErr);
      return { success: false, error: insertErr.message || 'Failed to enroll student.' };
    }

    revalidatePath('/dashboard/students');

    return {
      success: true,
      student: newStudent as Student,
    };
  } catch (err: any) {
    console.error('Unexpected error in addStudent:', err);

    if (
      err.code === '23505' ||
      err.message?.includes('uq_students_class_roll') ||
      err.message?.includes('roll_number')
    ) {
      return {
        success: false,
        error: `Roll ${rollNumber} already exists in this class.`,
      };
    }

    return {
      success: false,
      error: err.message || 'Failed to enroll student.',
    };
  }
}
