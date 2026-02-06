import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type InviteRole = 'committee' | 'player' | 'admin';

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizePassword(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeRole(value: unknown): InviteRole | null {
  if (value === 'committee' || value === 'player' || value === 'admin') return value;
  return null;
}

function normalizeName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is committee or admin via players table
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!currentPlayer || !['committee', 'admin'].includes(currentPlayer.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const email = normalizeEmail(body?.email);
  const tempPassword = normalizePassword(body?.tempPassword);
  const role = normalizeRole(body?.role);
  const firstName = normalizeName(body?.firstName);
  const lastName = normalizeName(body?.lastName);

  if (!email || !tempPassword || !role) {
    return NextResponse.json({ error: 'Invalid invite payload.' }, { status: 400 });
  }

  if (tempPassword.length < 8) {
    return NextResponse.json({ error: 'Temporary password must be at least 8 characters.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  
  // Check if email already exists in players table
  const { data: existingPlayer } = await adminClient
    .from('players')
    .select('id, auth_user_id')
    .eq('email', email)
    .single();

  if (existingPlayer?.auth_user_id) {
    return NextResponse.json({ error: 'This email is already linked to an account.' }, { status: 400 });
  }

  // Create auth user
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !createdUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Unable to create user.' }, { status: 400 });
  }

  // Update profiles table with must_change_password flag
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: createdUser.user.id,
    must_change_password: true,
  });

  if (profileError) {
    console.error('Profile upsert error:', profileError);
    // Continue anyway - profile record may be created by trigger
  }

  // If player already exists (created via admin page), link auth_user_id
  // Otherwise, create new player record
  if (existingPlayer) {
    const { error: updateError } = await adminClient
      .from('players')
      .update({ 
        auth_user_id: createdUser.user.id,
        role: role,
      })
      .eq('id', existingPlayer.id);

    if (updateError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  } else {
    // Create new player record
    const { error: playerError } = await adminClient.from('players').insert({
      auth_user_id: createdUser.user.id,
      email: email,
      first_name: firstName || 'New',
      last_name: lastName || 'Player',
      role: role,
      status: 'pending',
    });

    if (playerError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return NextResponse.json({ error: playerError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
