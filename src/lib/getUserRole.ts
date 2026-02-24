import type { PlayerRole } from '@/types/database';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { fetchPlayerRoleByAuthUserId } from '@/lib/repositories/players';

export type UserRole = PlayerRole;

export async function getUserRole(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await fetchPlayerRoleByAuthUserId(supabase, userId);

  if (error) {
    return null;
  }

  return data?.role ?? null;
}
