import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { isAdminRole, tempPasswordPolicy } from '@/lib/authConfig';
import { fetchPlayerRoleByAuthUserId } from '@/lib/repositories/players';

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizePassword(value: unknown) {
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

  const { data: currentPlayer } = await fetchPlayerRoleByAuthUserId(supabase, user.id);

  if (!currentPlayer || !isAdminRole(currentPlayer.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const email = normalizeEmail(body?.email);
  const tempPassword = normalizePassword(body?.tempPassword);

  if (!email || !tempPassword) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  if (tempPassword.length < tempPasswordPolicy.minLength) {
    return NextResponse.json(
      { error: `Temporary password must be at least ${tempPasswordPolicy.minLength} characters.` },
      { status: 400 },
    );
  }

  const adminClient = createSupabaseAdminClient();
  let targetUserId: string | null = null;

  const { data: playerLookup } = await adminClient
    .from('players')
    .select('auth_user_id')
    .eq('email', email)
    .maybeSingle();

  if (playerLookup?.auth_user_id) {
    targetUserId = playerLookup.auth_user_id;
  } else {
    const perPage = 200;
    let page = 1;
    let foundUserId: string | null = null;

    while (!foundUserId) {
      const { data: userLookup, error: userLookupError } =
        await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

      if (userLookupError) {
        return NextResponse.json({ error: userLookupError.message }, { status: 400 });
      }

      const users = userLookup?.users ?? [];
      const matchedUser = users.find((candidate) => candidate.email?.toLowerCase() === email);

      if (matchedUser) {
        foundUserId = matchedUser.id;
        break;
      }

      if (users.length < perPage) {
        break;
      }

      page += 1;
    }

    if (!foundUserId) {
      return NextResponse.json({ error: 'No user found for that email.' }, { status: 404 });
    }

    targetUserId = foundUserId;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'Unable to resolve user for that email.' }, { status: 404 });
  }

  const { error: resetError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: tempPassword,
  });

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: targetUserId,
    must_change_password: true,
  });

  if (profileError) {
    console.error('Profile update error:', profileError);
  }

  return NextResponse.json({ ok: true });
}
