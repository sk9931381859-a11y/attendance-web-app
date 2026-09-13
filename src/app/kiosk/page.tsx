import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function KioskPage() {
  redirect('/kiosk/default');
}
