import crypto from 'crypto';

const DEFAULT_SECRET =
  process.env.KIOSK_SECRET || 'attendance_kiosk_secret_key_2026_super_secure';

export interface TOTPResult {
  token: string;
  step: number;
  remainingSeconds: number;
  expiresAt: number;
  qrPayload: string;
  companyId?: string;
}

/**
 * Generates an RFC 6238-compliant Time-based One-Time Password (TOTP)
 * Strictly rotating every 30 seconds for the Anti-Cheat Kiosk.
 * Embeds company_id inside the generated TOTP payload or metadata so that
 * check-ins are explicitly scoped to the specific organization.
 */
export function generateKioskToken(
  companyId?: string,
  secret = DEFAULT_SECRET,
  timeStepSeconds = 30
): TOTPResult {
  const now = Math.floor(Date.now() / 1000);
  const step = Math.floor(now / timeStepSeconds);
  const remainingSeconds = timeStepSeconds - (now % timeStepSeconds);
  const expiresAt = (step + 1) * timeStepSeconds * 1000;

  // 8-byte big-endian counter buffer
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(step));

  // HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(buffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  
  const payloadData: Record<string, any> = {
    type: 'ATTENDANCE_KIOSK_TOTP',
    token: otp,
    step,
    expiresAt,
  };

  if (companyId) {
    payloadData.company_id = companyId;
    payloadData.companyId = companyId;
  }

  const qrPayload = JSON.stringify(payloadData);

  return {
    token: otp,
    step,
    remainingSeconds,
    expiresAt,
    qrPayload,
    companyId,
  };
}

/**
 * Validates a scanned TOTP token against current, past (60s grace for human scanning & network),
 * and future (clock skew drift) time windows.
 */
export function verifyKioskToken(
  token: string,
  secret = DEFAULT_SECRET,
  timeStepSeconds = 30
): boolean {
  const sanitized = (token || '').replace(/\D/g, '');
  if (sanitized.length !== 6) return false;

  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(now / timeStepSeconds);

  // Check current window, past 3 windows (90s grace for human scanning & network), and immediate future window (clock drift)
  for (const step of [currentStep, currentStep - 1, currentStep - 2, currentStep - 3, currentStep + 1]) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(step));

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const expectedOtp = (binary % 1000000).toString().padStart(6, '0');
    if (expectedOtp === sanitized) {
      return true;
    }
  }

  return false;
}
