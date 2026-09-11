import crypto from 'crypto';

const DEFAULT_SECRET =
  process.env.KIOSK_SECRET || 'attendance_kiosk_secret_key_2026_super_secure';

export interface TOTPResult {
  token: string;
  step: number;
  remainingSeconds: number;
  expiresAt: number;
  qrPayload: string;
}

/**
 * Generates an RFC 6238-compliant Time-based One-Time Password (TOTP)
 * Strictly rotating every 30 seconds for the Anti-Cheat Kiosk.
 */
export function generateKioskToken(
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
  const qrPayload = JSON.stringify({
    type: 'ATTENDANCE_KIOSK_TOTP',
    token: otp,
    step,
    expiresAt,
  });

  return {
    token: otp,
    step,
    remainingSeconds,
    expiresAt,
    qrPayload,
  };
}

/**
 * Validates a scanned TOTP token against current and immediate past time windows (30s grace).
 */
export function verifyKioskToken(
  token: string,
  secret = DEFAULT_SECRET,
  timeStepSeconds = 30
): boolean {
  if (!token || token.length !== 6) return false;

  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(now / timeStepSeconds);

  for (const step of [currentStep, currentStep - 1]) {
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
    if (expectedOtp === token) {
      return true;
    }
  }

  return false;
}
