import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

/**
 * Flags a finalized scorecard for committee review (decision 2.5). Does not revert
 * the scoreboard -- it's the replacement for opponent confirmation, lighter-weight
 * than a gate in front of the result.
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: callerPlayer } = await supabase
    .from('players')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();
  if (!callerPlayer) {
    return NextResponse.json({ error: 'Player record not found' }, { status: 404 });
  }

  const isCommittee = callerPlayer.role === 'committee' || callerPlayer.role === 'admin';
  if (!isCommittee) {
    const { data: participant } = await supabase
      .from('match_players')
      .select('player_id')
      .eq('match_id', matchId)
      .eq('player_id', callerPlayer.id)
      .maybeSingle();
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
    }
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('match_scorecards')
    .update({ disputed_at: new Date().toISOString(), disputed_by_player_id: callerPlayer.id })
    .eq('match_id', matchId)
    .eq('status', 'final')
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'No finalized scorecard found for this match' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
