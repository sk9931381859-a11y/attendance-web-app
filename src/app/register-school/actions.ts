'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface RegisterSchoolInput {
  schoolName: string;
  address?: string;
  pincode?: string;
  adminName: string;
  email: string;
  password: string;
}

export interface RegisterSchoolResult {
  success: boolean;
  error?: string;
  schoolCode?: string;
  kioskPin?: string;
  schoolName?: string;
  redirectTo?: string;
}

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
 * Server Action: Provisions a new school tenant, generates 6-digit school_code & 4-digit kiosk_pin,
 * and sets up the primary school administrator profile.
 */
export async function registerSchoolAction(
  data: RegisterSchoolInput
): Promise<RegisterSchoolResult> {
  const schoolName = data.schoolName?.trim();
  const address = data.address?.trim() || null;
  const pincode = data.pincode?.trim() || null;
  const adminName = data.adminName?.trim();
  const email = data.email?.trim().toLowerCase();
  const password = data.password?.trim();

  // Basic Validation
  if (!schoolName || schoolName.length < 2) {
    return { success: false, error: 'Please enter a valid institution or school name.' };
  }

  if (!adminName || adminName.length < 2) {
    return { success: false, error: 'Please enter the principal or administrator full name.' };
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'Please enter a valid administrative work email.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters in length.' };
  }

  let adminClient;
  try {
    adminClient = getAdminClient();
  } catch (err: unknown) {
    console.error('Admin client initialization failed:', err);
    return { success: false, error: 'Server configuration error. Please contact system support.' };
  }

  try {
    // 1. Generate collision-free 6-digit school_code
    let schoolCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      schoolCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { data: existing } = await adminClient
        .from('schools')
        .select('id')
        .eq('school_code', schoolCode)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return { success: false, error: 'Could not allocate unique school code. Please try again.' };
    }

    // Generate 4-digit kiosk_pin
    const kioskPin = Math.floor(1000 + Math.random() * 9000).toString();

    // 2. Insert new school tenant into public.schools
    const { data: school, error: schoolError } = await adminClient
      .from('schools')
      .insert({
        name: schoolName,
        address,
        pincode,
        school_code: schoolCode,
        kiosk_pin: kioskPin,
      })
      .select('id, name, school_code, kiosk_pin')
      .single();

    if (schoolError || !school) {
      console.error('Failed to create school record:', schoolError);
      return { success: false, error: `Failed to create school workspace: ${schoolError?.message || 'Database error'}` };
    }

    // 3. Create Principal account via Supabase Auth Admin
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'admin',
        school_id: school.id,
      },
    });

    if (authError || !authData?.user) {
      console.error('Failed to create admin user during school registration:', authError);
      // Rollback school creation
      await adminClient.from('schools').delete().eq('id', school.id);

      if (authError?.message?.toLowerCase().includes('already registered') || authError?.message?.toLowerCase().includes('already exists')) {
        return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
      }
      return { success: false, error: authError?.message || 'Failed to create administrator account.' };
    }

    const newUserId = authData.user.id;

    // 4. Ensure public.profiles record is populated
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        name: adminName,
        email,
        role: 'admin',
        school_id: school.id,
        designation: 'School Principal',
        shift_start_time: '08:00:00',
      });

    if (profileError) {
      console.error('Failed to bind administrator profile:', profileError);
    }

    // 5. Update auth.users raw_app_meta_data for Edge JWT claims
    await adminClient.auth.admin.updateUserById(newUserId, {
      app_metadata: {
        role: 'admin',
        school_id: school.id,
      },
    });

    // 6. Sign user in using user client to establish session cookies
    const userClient = createClient();
    await userClient.auth.signInWithPassword({
      email,
      password,
    });

    return {
      success: true,
      schoolCode: school.school_code,
      kioskPin: school.kiosk_pin,
      schoolName: school.name,
      redirectTo: '/dashboard',
    };
  } catch (err: unknown) {
    console.error('Unexpected error in registerSchoolAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during school registration.',
    };
  }
}
