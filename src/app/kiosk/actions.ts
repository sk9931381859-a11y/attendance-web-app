'use server';

import { createClient } from '@/lib/supabase/server';

export interface VerifyKioskPinResult {
  success: boolean;
  school_id?: string;
  school_name?: string;
  school_code?: string;
  error?: string;
}

/**
 * Server Action: Calls the verify_kiosk_pin RPC to authenticate a kiosk device
 * without needing user session credentials.
 */
export async function verifyKioskPinAction(
  schoolCode: string,
  kioskPin: string
): Promise<VerifyKioskPinResult> {
  const cleanCode = (schoolCode || '').trim().toUpperCase();
  const cleanPin = (kioskPin || '').trim();

  if (!cleanCode || !cleanPin) {
    return { success: false, error: 'Both School Code and Kiosk PIN are required.' };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('verify_kiosk_pin', {
      p_school_code: cleanCode,
      p_pin: cleanPin,
    });

    if (error) {
      console.error('RPC verify_kiosk_pin error:', error);
      return { success: false, error: error.message || 'Failed to verify kiosk credentials.' };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.error || 'Invalid School Code or Kiosk PIN.',
      };
    }

    return {
      success: true,
      school_id: data.school_id,
      school_name: data.school_name,
      school_code: data.school_code,
    };
  } catch (err: any) {
    console.error('Unexpected error during kiosk verification:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred. Please try again.',
    };
  }
}
