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
 * Pull unique class names for the school dynamically from the students table.
 * Also combines pre-configured classes from academic_classes so all existing classes are available in the datalist.
 */
export async function fetchClasses(): Promise<{
  success: boolean;
  data: string[];
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

    // 1. Dynamic query extracting unique class names directly from the students table
    const { data: studentRows, error: studentErr } = await client
      .from('students')
      .select('class')
      .eq('school_id', tenant.schoolId)
      .not('class', 'is', null)
      .order('class', { ascending: true });

    if (studentErr) {
      console.error('Error fetching student classes:', studentErr);
    }

    // 2. Also query academic_classes so any predefined institution cohorts appear as suggestions
    const { data: academicRows, error: academicErr } = await client
      .from('academic_classes')
      .select('name')
      .eq('school_id', tenant.schoolId)
      .order('name', { ascending: true });

    if (academicErr) {
      console.error('Error fetching academic classes:', academicErr);
    }

    const rawClasses: string[] = [
      ...((studentRows || []).map((r: any) => r.class)),
      ...((academicRows || []).map((r: any) => r.name)),
    ].filter((c): c is string => Boolean(c && typeof c === 'string' && c.trim().length > 0));

    // Map/filter through a Set to eliminate duplicates and sort alphabetically
    const uniqueClasses = Array.from(new Set(rawClasses.map((c) => c.trim()))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    return {
      success: true,
      data: uniqueClasses,
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchClasses:', err);
    return {
      success: false,
      data: [],
      error: err.message || 'Failed to fetch classes.',
    };
  }
}

/**
 * Pull all students assigned to the selected class name (or class_id), ordered by roll_number.
 */
export async function fetchStudents(classIdentifier: string): Promise<{
  success: boolean;
  data: Student[];
  error?: string;
}> {
  try {
    if (!classIdentifier) {
      return { success: false, data: [], error: 'Class identifier is required.' };
    }

    const supabase = createClient();
    const tenant = await resolveCurrentTenant();
    if (tenant.error) {
      return { success: false, data: [], error: tenant.error };
    }

    const adminClient = getAdminClient();
    const client = adminClient || supabase;

    // Support querying by class text name, or fallback by class_id if UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classIdentifier);

    let query = client
      .from('students')
      .select('id, school_id, class_id, class, name, roll_number, parent_whatsapp, created_at')
      .eq('school_id', tenant.schoolId);

    if (isUuid) {
      query = query.or(`class_id.eq.${classIdentifier},class.eq."${classIdentifier}"`);
    } else {
      query = query.eq('class', classIdentifier);
    }

    const { data: students, error: studentErr } = await query.order('roll_number', { ascending: true });

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
 * Insert a new student with dynamic on-the-fly class creation.
 * Accepts raw selectedClass string without pre-existing validation constraints.
 * Handles unique roll_number constraint violations gracefully.
 */
export async function addStudent(
  selectedClass: string,
  name: string,
  rollNumber: number,
  phone: string
): Promise<{
  success: boolean;
  student?: Student;
  error?: string;
}> {
  try {
    const trimmedClass = (selectedClass || '').trim();
    const trimmedName = (name || '').trim();

    if (!trimmedClass) {
      return { success: false, error: 'Please enter or select a class for this student.' };
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

    // Check if an academic_classes row matches this class name to link class_id for backward compatibility
    let matchedClassId: string | null = null;
    const { data: matchedClass } = await client
      .from('academic_classes')
      .select('id')
      .eq('school_id', tenant.schoolId)
      .ilike('name', trimmedClass)
      .maybeSingle();

    if (matchedClass) {
      matchedClassId = matchedClass.id;
    }

    const { data: newStudent, error: insertErr } = await client
      .from('students')
      .insert([
        {
          school_id: tenant.schoolId,
          class: trimmedClass,
          class_id: matchedClassId,
          name: trimmedName,
          roll_number: parsedRoll,
          parent_whatsapp: cleanPhone,
        },
      ])
      .select('id, school_id, class_id, class, name, roll_number, parent_whatsapp, created_at')
      .single();

    if (insertErr) {
      // Gracefully handle unique roll number constraint violation
      if (
        insertErr.code === '23505' ||
        insertErr.message?.includes('uq_students') ||
        insertErr.message?.includes('roll_number')
      ) {
        return {
          success: false,
          error: `Roll ${parsedRoll} already exists in "${trimmedClass}". Please assign a unique roll number.`,
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
      err.message?.includes('uq_students') ||
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
