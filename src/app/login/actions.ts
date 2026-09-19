'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Initialize Upstash Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

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
 * Server Action: Multi-Tenant Sign-In with Rate Limiting
 * 1. Validates school_code against public.schools table.
 * 2. Authenticates email and password.
 * 3. Enforces that the user profile belongs to the specified school tenant.
 * 4. Injects school_id and role into session/JWT.
 * 5. Routes Admin to /dashboard and Teacher/Staff to /faculty.
 */
export async function loginWithRateLimit(formData: FormData) {
  const schoolCode = (formData.get('school_code') as string)?.trim().toUpperCase();
  const email = (formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();

  if (!schoolCode) {
    return { error: 'School Code is required. Contact your school administration if needed.' };
  }

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  // Rate limiting check
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';

  try {
    const { success } = await ratelimit.limit(`login:${clientIp}`);
    if (!success) {
      return { error: 'Too many login attempts. Please wait 1 minute before trying again.' };
    }
  } catch (rateErr) {
    console.warn('Rate limiter error (failing open):', rateErr);
  }

  // 1. Verify that the school_code exists
  let adminClient;
  try {
    adminClient = getAdminClient();
  } catch (err) {
    console.error('Failed to init admin client:', err);
    return { error: 'Server configuration error.' };
  }

  const { data: school, error: schoolErr } = await adminClient
    .from('schools')
    .select('id, name, school_code')
    .eq('school_code', schoolCode)
    .maybeSingle();

  if (schoolErr || !school) {
    return { error: `School code "${schoolCode}" not found. Please verify your 6-digit code.` };
  }

  // 2. Authenticate user credentials
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData?.user) {
    return { error: authError?.message || 'Invalid email or password.' };
  }

  const userId = authData.user.id;

  // 3. Verify user belongs to the matching school
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.school_id && profile.school_id !== school.id) {
    // Cross-tenant breach attempt: sign out immediately
    await supabase.auth.signOut();
    return {
      error: `Access Denied: Your account is registered under a different institution, not "${school.name}".`,
    };
  }

  // If profile is missing school_id, bind it now to this school
  if (!profile?.school_id) {
    await adminClient.from('profiles').update({ school_id: school.id }).eq('id', userId);
  }

  // Ensure auth user raw_app_meta_data carries school_id and role
  const effectiveRole = profile?.role || (authData.user.app_metadata as { role?: string })?.role || 'staff';
  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      role: effectiveRole,
      school_id: school.id,
    },
  });

  // 4. Role-based redirection: Admin -> /dashboard, Teacher/Staff -> /faculty
  if (effectiveRole === 'admin') {
    redirect('/dashboard');
  } else {
    redirect('/faculty');
  }
}
