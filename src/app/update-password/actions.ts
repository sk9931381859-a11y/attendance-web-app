'use server';

import { createClient } from '@/lib/supabase/server';

export interface UpdatePasswordResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Server Action: Update user password
 * Executes supabase.auth.updateUser({ password: newPassword })
 * Redirects to /login upon success.
 */
export async function updatePasswordAction(
  newPassword: string
): Promise<UpdatePasswordResult> {
  const password = newPassword?.trim();

  if (!password || password.length < 6) {
    return {
      success: false,
      error: 'New password must be at least 6 characters in length.',
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error('Supabase updateUser error:', error);
      return {
        success: false,
        error:
          error.message ||
          'Failed to update password. Your recovery link may have expired or is invalid.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Active session not found. Please request a new password recovery link.',
      };
    }

    return {
      success: true,
      redirectTo: '/login?password_updated=true',
    };
  } catch (err: unknown) {
    console.error('Unhandled update password error:', err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while updating your password.',
    };
  }
}
