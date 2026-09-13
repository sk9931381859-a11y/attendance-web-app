import { NextRequest, NextResponse } from 'next/server';
import { generateKioskToken } from '@/lib/totp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId') || undefined;
  const result = generateKioskToken(companyId);
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
