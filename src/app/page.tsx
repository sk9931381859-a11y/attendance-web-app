import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Direct user to their appropriate tenant workspace based on their verified role
  const role = (user.app_metadata as { role?: string } | undefined)?.role;
  if (role === 'staff') {
    redirect('/faculty');
  }

  redirect('/dashboard');
}
