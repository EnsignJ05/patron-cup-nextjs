import { redirect } from 'next/navigation';
import { getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const { data: profile } = await getCachedPlayerProfile(user.id);

  if (profile?.role !== 'committee' && profile?.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
