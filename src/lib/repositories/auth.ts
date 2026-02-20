import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerRole } from '@/types/database';
import { fetchPlayerRoleByAuthUserId } from '@/lib/repositories/players';

export interface AuthProfile {
  role: PlayerRole | null;
  mustChangePassword: boolean;
}

export async function fetchAuthProfileByUserId(supabase: SupabaseClient, userId: string) {
  const [{ data: player, error: playerError }, { data: profile, error: profileError }] =
    await Promise.all([
      fetchPlayerRoleByAuthUserId(supabase, userId),
      supabase.from('profiles').select('must_change_password').eq('id', userId).single(),
    ]);

  const error = playerError ?? profileError ?? null;
  const data: AuthProfile = {
    role: player?.role ?? null,
    mustChangePassword: Boolean(profile?.must_change_password),
  };

  return { data, error };
}
