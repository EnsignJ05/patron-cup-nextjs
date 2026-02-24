import { redirect } from 'next/navigation';
import { getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';
import { isAdminRole } from '@/lib/authConfig';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const { data: profile } = await getCachedPlayerProfile(user.id);

  if (!isAdminRole(profile?.role ?? null)) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
