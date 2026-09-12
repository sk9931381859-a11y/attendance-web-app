'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Server Action: Authenticates user via Supabase Email/Password.
 * Verifies that the user has the 'admin' role before allowing dashboard access.
 */
export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid email or password.',
      };
    }

    // Verify role in profiles table
    let userRole = 'staff';
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profile?.role) {
      userRole = profile.role;
    }

    const redirectTo = userRole === 'admin' ? '/dashboard' : '/scan';

    return {
      success: true,
      redirectTo,
      user: {
        id: authData.user.id,
        email: authData.user.email || email,
        name: profile?.name || authData.user.user_metadata?.name || email.split('@')[0],
        role: userRole,
      },
    };
  } catch (err: unknown) {
    console.error('Sign in error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during sign in.',
    };
  }
}

/**
 * Server Action: Signs out the active user session and redirects to /login.
 */
export async function signOutAction() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  }
  redirect('/login');
}

/**
 * Server Action: Retrieves the currently authenticated user and profile.
 */
export async function getCurrentUserAction() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, role, shift_start_time')
      .eq('id', user.id)
      .single();

    return {
      user,
      profile,
      isAdmin: profile?.role === 'admin',
    };
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}
