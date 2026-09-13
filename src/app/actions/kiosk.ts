'use server';

import { generateKioskToken, TOTPResult } from '@/lib/totp';

/**
 * Server Action: Generates the latest 30-second TOTP token on the server.
 * Scoped to organization companyId if provided.
 */
export async function getKioskTokenAction(companyId?: string): Promise<TOTPResult> {
  return generateKioskToken(companyId);
}
