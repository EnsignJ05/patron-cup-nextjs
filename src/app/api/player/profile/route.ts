import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

function normalizeString(value: unknown, maxLength = 120) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get player record to verify they have access
  const { data: playerRecord } = await supabase
    .from('players')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!playerRecord) {
    return NextResponse.json({ error: 'Player record not found' }, { status: 404 });
  }

  const body = await request.json();
  const firstName = normalizeString(body.firstName, 100);
  const lastName = normalizeString(body.lastName, 100);
  const phone = normalizeString(body.phone, 20);
  const handicapStr = normalizeString(body.handicap, 10);
  const handicap = handicapStr ? parseFloat(handicapStr) : null;

  // Update the players table
  const { error } = await supabase
    .from('players')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      current_handicap: handicap,
    })
    .eq('id', playerRecord.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
