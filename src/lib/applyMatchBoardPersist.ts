import type { SupabaseClient } from '@supabase/supabase-js';
import { isSlotWithinCapacity, matchTimesEqual } from '@/lib/matchFormatConfig';
import { parseSlotId, type TeeTimeSlotSpec } from '@/lib/matchSetupBoard';
import type { Match } from '@/types/database';

type MatchLite = Pick<Match, 'id' | 'match_number' | 'match_time' | 'group_number' | 'match_type'>;

function findSlotForMatch(matchId: string, board: Record<string, string[]>): string | undefined {
  return Object.keys(board).find((slotId) => board[slotId].includes(matchId));
}

function validateEndBoard(end: Record<string, string[]>, byId: Map<string, MatchLite>): void {
  for (const [slotId, ids] of Object.entries(end)) {
    if (!ids?.length) continue;
    const spec = parseSlotId(slotId);
    if (!spec) throw new Error(`Invalid slot: ${slotId}`);
    const types: string[] = [];
    for (const id of ids) {
      const m = byId.get(id);
      if (!m) throw new Error(`Unknown match: ${id}`);
      if (!matchTimesEqual(m.match_time, spec.match_time)) {
        throw new Error(
          'Cannot assign a match to a different tee time from this page. Reload and try again.',
        );
      }
      types.push(m.match_type);
    }
    if (!isSlotWithinCapacity(types)) {
      throw new Error('A swim lane cannot exceed four players for the match formats in use.');
    }
  }
}

/**
 * Applies group changes within a fixed tee time and renumbers `match_number` within each column.
 * Does not change `match_time` (immutable on the match setup page).
 */
export async function applyMatchBoardPersist(
  supabase: SupabaseClient,
  matches: MatchLite[],
  start: Record<string, string[]>,
  end: Record<string, string[]>,
): Promise<void> {
  const byId = new Map(matches.map((m) => [m.id, m]));

  validateEndBoard(end, byId);

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
    const row = byId.get(id);
    if (!row) continue;
    if (!matchTimesEqual(row.match_time, spec.match_time)) {
      throw new Error(
        'Cannot assign a match to a different tee time from this page. Reload and try again.',
      );
    }
    const { error } = await supabase
      .from('matches')
      .update({
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

    const nums = ids.map((mid) => byId.get(mid)?.match_number ?? 0).sort((a, b) => a - b);
    await Promise.all(
      ids.map((mid, i) =>
        supabase.from('matches').update({ match_number: nums[i] }).eq('id', mid),
      ),
    );
  }
}
