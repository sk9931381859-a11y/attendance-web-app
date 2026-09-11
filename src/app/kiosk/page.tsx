import React from 'react';
import { Metadata } from 'next';
import KioskScreen from '@/components/kiosk/KioskScreen';
import { generateKioskToken } from '@/lib/totp';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Anti-Cheat Kiosk | Attendance Web App',
  description: 'Dynamic TOTP QR Code screen for institutional attendance check-ins.',
};

export default async function KioskPage() {
  const initialToken = generateKioskToken();

  return <KioskScreen initialToken={initialToken} />;
}
