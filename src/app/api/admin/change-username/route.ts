import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { isAdminRole } from '@/lib/authConfig';
import { fetchPlayerRoleByAuthUserId } from '@/lib/repositories/players';

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

async function findAuthUserIdByEmail(adminClient: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data: userLookup, error: userLookupError } =
      await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

    if (userLookupError) {
      return { error: userLookupError.message, userId: null };
    }

    const users = userLookup?.users ?? [];
    const matchedUser = users.find((candidate) => candidate.email?.toLowerCase() === email);

    if (matchedUser) {
      return { error: null, userId: matchedUser.id };
    }

    if (users.length < perPage) {
      return { error: null, userId: null };
    }

    page += 1;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: currentPlayer } = await fetchPlayerRoleByAuthUserId(supabase, user.id);

  if (!currentPlayer || !isAdminRole(currentPlayer.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const currentEmail = normalizeEmail(body?.currentEmail);
  const newEmail = normalizeEmail(body?.newEmail);

  if (!currentEmail || !newEmail) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  if (currentEmail === newEmail) {
    return NextResponse.json({ error: 'New email must be different.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();

  const { data: playerLookup } = await adminClient
    .from('players')
    .select('id, auth_user_id')
    .eq('email', currentEmail)
    .maybeSingle();

  let targetUserId = playerLookup?.auth_user_id ?? null;

  if (!targetUserId) {
    const { error: lookupError, userId } = await findAuthUserIdByEmail(adminClient, currentEmail);

    if (lookupError) {
      return NextResponse.json({ error: lookupError }, { status: 400 });
    }

    targetUserId = userId;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'No user found for that email.' }, { status: 404 });
  }

  const { data: existingPlayer } = await adminClient
    .from('players')
    .select('auth_user_id')
    .eq('email', newEmail)
    .maybeSingle();

  if (existingPlayer?.auth_user_id && existingPlayer.auth_user_id !== targetUserId) {
    return NextResponse.json({ error: 'That email is already linked to another account.' }, { status: 400 });
  }

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    email: newEmail,
    email_confirm: true,
  });

  if (updateAuthError) {
    return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
  }

  const { error: updatePlayerError } = await adminClient
    .from('players')
    .update({ email: newEmail })
    .eq('auth_user_id', targetUserId);

  if (updatePlayerError) {
    return NextResponse.json({ error: updatePlayerError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
