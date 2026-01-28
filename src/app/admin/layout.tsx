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
    .from('profiles')
    .select('role')
    .eq('player_id', user.id)
    .single();

  if (profile?.role !== 'committee') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
