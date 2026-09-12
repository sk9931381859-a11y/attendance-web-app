/**
 * Utility helper for Cryptographic Device Fingerprinting.
 * Retrieves or generates a persistent device UUID stored in localStorage under 'attendance_device_token'.
 */

export const DEVICE_TOKEN_KEY = 'attendance_device_token';

/**
 * Generates a standard RFC4122 v4 UUID string.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browser engines
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieves the persistent device UUID from localStorage.
 * If not present, generates a new one, persists it under 'attendance_device_token', and returns it.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    let deviceId = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!deviceId || deviceId.trim().length === 0) {
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_TOKEN_KEY, deviceId);
    }
    return deviceId;
  } catch (err) {
    console.warn('localStorage is unavailable for device fingerprinting:', err);
    return generateUUID();
  }
}

/**
 * Retrieves the currently stored device ID without generating a new one.
 */
export function getStoredDeviceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets a specific device ID in localStorage (useful for testing or simulated devices).
 */
export function setDeviceId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, id);
  } catch (err) {
    console.warn('Failed to set device ID in localStorage:', err);
  }
}

/**
 * Clears the device ID from localStorage.
 */
export function clearDeviceId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to clear device ID from localStorage:', err);
  }
}
