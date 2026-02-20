import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerRole } from '@/types/database';

export async function fetchPlayerRoleByAuthUserId(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('players')
    .select('role')
    .eq('auth_user_id', userId)
    .single<{ role: PlayerRole }>();
}

export async function fetchPlayerProfileByAuthUserId(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('players')
    .select('id, first_name, last_name, current_handicap, email, phone, role, profile_image_url')
    .eq('auth_user_id', userId)
    .single();
}
