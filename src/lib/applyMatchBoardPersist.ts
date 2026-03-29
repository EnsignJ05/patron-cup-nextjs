import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSlotId, type TeeTimeSlotSpec } from '@/lib/matchSetupBoard';
import type { Match } from '@/types/database';

type MatchLite = Pick<Match, 'id' | 'match_number' | 'match_time' | 'group_number'>;

function findSlotForMatch(matchId: string, board: Record<string, string[]>): string | undefined {
  return Object.keys(board).find((slotId) => board[slotId].includes(matchId));
}

/**
 * Applies tee-time / group changes and renumbers `match_number` within each column
 * to preserve the multiset of numbers across the board.
 */
export async function applyMatchBoardPersist(
  supabase: SupabaseClient,
  matches: MatchLite[],
  start: Record<string, string[]>,
  end: Record<string, string[]>,
): Promise<void> {
  const byId = new Map(matches.map((m) => [m.id, m]));

  const moves: { id: string; spec: TeeTimeSlotSpec }[] = [];
  for (const m of matches) {
    const from = findSlotForMatch(m.id, start);
    const to = findSlotForMatch(m.id, end);
    if (from !== to && to) {
      const spec = parseSlotId(to);
      if (spec) moves.push({ id: m.id, spec });
    }
  }

  for (const { id, spec } of moves) {
    const { error } = await supabase
      .from('matches')
      .update({
        match_time: spec.match_time,
        group_number: spec.group_number,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  const slotKeys = new Set([...Object.keys(start), ...Object.keys(end)]);
  for (const slotId of slotKeys) {
    const ids = end[slotId];
    if (!ids?.length) continue;

    const startOrder = (start[slotId] || []).join('\0');
    const endOrder = ids.join('\0');
    if (startOrder === endOrder) continue;

    const nums = ids.map((id) => byId.get(id)?.match_number ?? 0).sort((a, b) => a - b);
    await Promise.all(
      ids.map((id, i) =>
        supabase.from('matches').update({ match_number: nums[i] }).eq('id', id),
      ),
    );
  }
}
