import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create a rate limiter allowing a maximum of 5 requests per 1 minute per IP address
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

export async function middleware(request: NextRequest) {
  // Apply this rate limiter exclusively to POST requests hitting /login and /register
  if (request.method !== 'POST') {
    return NextResponse.next();
  }

  // Let Next.js Server Actions be handled by dedicated server action rate limiter (loginWithRateLimit)
  if (request.headers.has('next-action')) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname !== '/login' && pathname !== '/register') {
    return NextResponse.next();
  }

  // Extract IP address from request headers or socket
  const ip =
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      `auth_ratelimit_${ip}`
    );

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Too many requests. Please try again after 1 minute.',
        }),
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // In case of an Upstash Redis connection error, fail open to prevent locking out users
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register'],
};
