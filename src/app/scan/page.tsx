import React from 'react';
import { Metadata } from 'next';
import ScannerScreen from '@/components/scan/ScannerScreen';
import { getStaffProfilesAction } from '@/app/actions/checkin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff Check-In Scanner | Attendance Web App',
  description: 'Mobile HTML5 QR scanner with GPS Geofencing verification for teacher check-ins.',
};

export default async function ScanPage() {
  const profiles = await getStaffProfilesAction();

  return <ScannerScreen initialProfiles={profiles} />;
}
