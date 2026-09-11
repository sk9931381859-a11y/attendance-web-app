import { NextResponse } from 'next/server';
import { generateKioskToken } from '@/lib/totp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = generateKioskToken();
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
