'use server';

import { createClient } from '@/lib/supabase/server';

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Server Action: Verify 6-digit Email OTP for user signup
 * Executes supabase.auth.verifyOtp({ email, token, type: 'signup' })
 * Upon successful verification, session cookies are set and caller is directed to /dashboard.
 */
export async function verifyOtpAction(
  email: string,
  token: string
): Promise<VerifyOtpResult> {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanToken = token?.trim();

  if (!cleanEmail) {
    return { success: false, error: 'Email address is required.' };
  }

  if (!cleanToken || cleanToken.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit verification code.' };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (error) {
      console.error('Supabase verifyOtp error:', error);
      return {
        success: false,
        error: error.message || 'Invalid or expired verification code. Please request a new code.',
      };
    }

    if (!data.user && !data.session) {
      return {
        success: false,
        error: 'Verification could not be confirmed. Please try again.',
      };
    }

    return {
      success: true,
      redirectTo: '/dashboard',
    };
  } catch (err: unknown) {
    console.error('Unhandled OTP verification error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during OTP verification.',
    };
  }
}

/**
 * Server Action: Resend Signup OTP to user email
 */
export async function resendOtpAction(
  email: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'Email address is required.' };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to resend verification code.',
    };
  }
}
