import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect('/login?next=/admin');
  }

  const { data: profile } = await supabase
    .from('players')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (profile?.role !== 'committee' && profile?.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
