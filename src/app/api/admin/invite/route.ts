import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type InviteRole = 'committee' | 'player';

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizePassword(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeRole(value: unknown): InviteRole | null {
  if (value === 'committee' || value === 'player') return value;
  return null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('player_id', user.id)
    .single();

  if (profile?.role !== 'committee') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const email = normalizeEmail(body?.email);
  const tempPassword = normalizePassword(body?.tempPassword);
  const role = normalizeRole(body?.role);

  if (!email || !tempPassword || !role) {
    return NextResponse.json({ error: 'Invalid invite payload.' }, { status: 400 });
  }

  if (tempPassword.length < 8) {
    return NextResponse.json({ error: 'Temporary password must be at least 8 characters.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !createdUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Unable to create user.' }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from('profiles').insert({
    player_id: createdUser.user.id,
    role,
    must_change_password: true,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
