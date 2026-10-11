import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { decideFinalizeMatchScorecard } from '@/lib/scoring/finalizeDecision';

/**
 * Server-verified auto-finalize (LIVE_SCORING_PLAN.md Task P3.5 / decision 2.5). The
 * request body is never read beyond the route param -- there is nothing in it to
 * trust. Everything is re-read from the database and scored by the same engine the
 * phone runs (src/lib/scoring), so a client can't claim a result the recorded holes
 * don't support.
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

  const [matchRes, scorecardRes, matchPlayersRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, course_id, match_type, result_set_by_official, winner_team_id, is_halved')
      .eq('id', matchId)
      .maybeSingle(),
    supabase
      .from('match_scorecards')
      .select('status, holes_count, format_key')
      .eq('match_id', matchId)
      .maybeSingle(),
    supabase.from('match_players').select('player_id, team_id, strokes_received').eq('match_id', matchId),
  ]);

  const match = matchRes.data;
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const [holeScoresRes, courseHolesRes] = await Promise.all([
    supabase
      .from('match_hole_scores')
      .select('hole_number, player_id, gross_strokes, is_conceded')
      .eq('match_id', matchId),
    match.course_id
      ? supabase.from('course_holes').select('hole_number, par, handicap_index').eq('course_id', match.course_id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const decision = decideFinalizeMatchScorecard({
    callerPlayerId: callerPlayer.id,
    callerRole: callerPlayer.role,
    resultSetByOfficial: match.result_set_by_official,
    currentResult: { winnerTeamId: match.winner_team_id, isHalved: match.is_halved },
    scorecard: scorecardRes.data,
    matchPlayers: matchPlayersRes.data ?? [],
    holeScores: holeScoresRes.data ?? [],
    courseHoles: courseHolesRes.data ?? [],
  });

  if (decision.kind === 'forbidden') {
    return NextResponse.json({ error: decision.message }, { status: 403 });
  }
  if (decision.kind === 'locked' || decision.kind === 'no_scorecard') {
    return NextResponse.json({ error: decision.message }, { status: 400 });
  }
  if (decision.kind === 'incomplete') {
    return NextResponse.json(
      { error: 'Round is not finished', incompleteHoles: decision.incompleteHoles },
      { status: 400 },
    );
  }
  if (decision.kind === 'already_final') {
    return NextResponse.json({
      ok: true,
      winnerTeamId: decision.winnerTeamId,
      isHalved: decision.isHalved,
      resultLabel: decision.resultLabel,
    });
  }

  const admin = createSupabaseAdminClient();
  const { error: matchUpdateError } = await admin
    .from('matches')
    .update({
      winner_team_id: decision.winnerTeamId,
      is_halved: decision.isHalved,
      result_set_by_official: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  if (matchUpdateError) {
    return NextResponse.json({ error: matchUpdateError.message }, { status: 500 });
  }

  await admin
    .from('match_scorecards')
    .update({ status: 'final', finalized_at: new Date().toISOString() })
    .eq('match_id', matchId);

  // A scorecard finalizing supersedes an in-flight paper proposal (decision 2.5).
  await admin
    .from('match_results_pending')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .eq('status', 'pending');

  return NextResponse.json({
    ok: true,
    winnerTeamId: decision.winnerTeamId,
    isHalved: decision.isHalved,
    resultLabel: decision.resultLabel,
  });
}
