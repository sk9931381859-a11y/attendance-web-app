'use server';

import { generateKioskToken, TOTPResult } from '@/lib/totp';

/**
 * Server Action: Generates the latest 30-second TOTP token on the server.
 */
export async function getKioskTokenAction(): Promise<TOTPResult> {
  return generateKioskToken();
}
