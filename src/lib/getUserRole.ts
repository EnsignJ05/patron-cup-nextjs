import { createSupabaseServerClient } from '@/lib/supabaseServer';

export type UserRole = 'committee' | 'player';

export async function getUserRole(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return (data?.role as UserRole | null) ?? null;
}
