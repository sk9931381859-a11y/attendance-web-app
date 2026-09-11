import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Check-In Scanner | Attendance Web App',
  description: 'Mobile HTML5 QR scanner with anti-cheat TOTP verification for teacher check-ins.',
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

