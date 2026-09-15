'use server';

import { createClient } from '@/lib/supabase/server';

export interface ForgotPasswordResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action: Initiate Password Recovery
 * Triggers supabase.auth.resetPasswordForEmail with explicit redirectTo URL.
 */
export async function requestPasswordResetAction(
  email: string
): Promise<ForgotPasswordResult> {
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: 'https://zenithflowhq.com/update-password',
    });

    if (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send password recovery email. Please try again.',
      };
    }

    return {
      success: true,
      message: 'If an account exists with this email, password recovery instructions have been sent.',
    };
  } catch (err: unknown) {
    console.error('Unhandled reset password error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again later.',
    };
  }
}
