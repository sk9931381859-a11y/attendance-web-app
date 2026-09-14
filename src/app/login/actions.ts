'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

// Initialize the Upstash Redis client and set the limiter: 5 attempts per 60 seconds
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

/**
 * Server Action: Server-Side Rate Limiting via Upstash Redis for Login Attempts
 * Extracts client IP reliably across proxy headers (Hostinger/Cloudflare).
 * Enforces 5 attempts per 60 seconds per client IP.
 */
export async function loginWithRateLimit(formData: FormData) {
  const email = (formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  // Extract the user's real IP address reliably through Hostinger's proxy
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';

  const { success } = await ratelimit.limit(`login:${clientIp}`);

  if (!success) {
    return { error: 'Too many login attempts. Please wait 1 minute before trying again.' };
  }

  const supabase = createClient();
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !data.user) {
    return { error: authError?.message || 'Invalid email or password.' };
  }

  redirect('/dashboard');
}
