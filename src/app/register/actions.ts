'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { generateSlug } from '@/lib/slug';

export interface RegisterOrganizationInput {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
}

export interface RegisterOrganizationResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  companySlug?: string;
  companyName?: string;
}

/**
 * Returns a dedicated Supabase Client using the Service Role Key
 * to bypass RLS for initial tenant and user provisioning.
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
 * Server Action: B2B Self-Serve Onboarding Pipeline
 * 1. Validates inputs and generates a collision-free URL slug.
 * 2. Inserts new tenant organization into public.companies.
 * 3. Creates administrator auth account via Supabase Auth Admin.
 *    - ROLLBACK: If user creation fails, automatically deletes the company record.
 * 4. Binds administrator profile in public.profiles.
 * 5. Automatically logs the user in via signInWithPassword so a session cookie is dropped.
 */
export async function registerOrganizationAction(
  data: RegisterOrganizationInput
): Promise<RegisterOrganizationResult> {
  const companyName = data.companyName?.trim();
  const adminName = data.adminName?.trim();
  const email = data.email?.trim().toLowerCase();
  const password = data.password?.trim();

  // Basic Validation
  if (!companyName || companyName.length < 2) {
    return { success: false, error: 'Please provide a valid institution or company name (minimum 2 characters).' };
  }

  if (!adminName || adminName.length < 2) {
    return { success: false, error: 'Please provide your full administrative name.' };
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'A valid work email address is required.' };
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

  let createdCompanyId: string | null = null;

  try {
    // 1. Generate unique URL-safe slug
    const baseSlug = generateSlug(companyName);
    let finalSlug = baseSlug;

    const { data: existingSlug } = await adminClient
      .from('companies')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();

    if (existingSlug) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      finalSlug = `${baseSlug}-${randomSuffix}`;
    }

    // 2. Transaction Step 1: Insert new tenant organization into public.companies
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({
        name: companyName,
        slug: finalSlug,
        subscription_status: 'active',
      })
      .select('id, name, slug')
      .single();

    if (companyError || !company) {
      console.error('Failed to provision company workspace:', companyError);
      return {
        success: false,
        error: `Failed to create organization workspace: ${companyError?.message || 'Database error'}`,
      };
    }

    createdCompanyId = company.id;

    // 3. Transaction Step 2: Create Administrator Account via Auth Admin
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'admin',
        company_id: createdCompanyId,
      },
    });

    if (authError || !authData?.user) {
      console.error('Failed to create admin user during onboarding:', authError);

      // ROLLBACK: Delete newly created company to prevent orphaned rows
      if (createdCompanyId) {
        console.log(`[Rollback] Deleting orphaned company ${createdCompanyId} due to auth failure...`);
        await adminClient.from('companies').delete().eq('id', createdCompanyId);
      }

      if (
        authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists')
      ) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      return {
        success: false,
        error: authError?.message || 'Failed to create administrator authentication account.',
      };
    }

    const newUserId = authData.user.id;

    // 4. Transaction Step 3: Ensure administrator profile in public.profiles is fully populated
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        name: adminName,
        email,
        role: 'admin',
        designation: 'School Principal (Admin)',
        shift_start_time: '08:00:00',
        company_id: createdCompanyId,
      });

    if (profileError) {
      console.error('Failed to bind administrator profile:', profileError);
      // Clean up both auth user and company
      await adminClient.auth.admin.deleteUser(newUserId);
      await adminClient.from('companies').delete().eq('id', createdCompanyId);
      return {
        success: false,
        error: `Failed to initialize administrator profile: ${profileError.message}`,
      };
    }

    // 5. Transaction Step 4: Drop session cookie into browser via standard signInWithPassword
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.warn('Direct sign-in session cookie error:', signInError);
        return {
          success: true,
          redirectTo: '/login?registered=true',
          companySlug: company.slug,
          companyName: company.name,
        };
      }
    } catch (cookieErr) {
      console.warn('Cookie sign-in warning:', cookieErr);
      return {
        success: true,
        redirectTo: '/login?registered=true',
        companySlug: company.slug,
        companyName: company.name,
      };
    }

    return {
      success: true,
      redirectTo: '/dashboard',
      companySlug: company.slug,
      companyName: company.name,
    };
  } catch (err: unknown) {
    console.error('Unhandled error during organization registration:', err);

    // Rollback orphaned company if created
    if (createdCompanyId) {
      try {
        await adminClient.from('companies').delete().eq('id', createdCompanyId);
      } catch {}
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during workspace provisioning.',
    };
  }
}
