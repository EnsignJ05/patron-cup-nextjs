import {
  localStorageKeyForMatch,
  removeQueueEntry,
  removeSentEntries,
  upsertQueueEntry,
} from '@/lib/offlineScoreQueue';

describe('offlineScoreQueue', () => {
  it('namespaces the storage key by match id', () => {
    expect(localStorageKeyForMatch('m1')).toBe('pc-offline-scores:m1');
    expect(localStorageKeyForMatch('m2')).toBe('pc-offline-scores:m2');
  });

  it('collapses a repeated tap on the same cell to the latest value', () => {
    const q1 = upsertQueueEntry([], { hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false });
    const q2 = upsertQueueEntry(q1, { hole_number: 1, player_id: 'p1', gross_strokes: 5, is_conceded: false });
    expect(q2).toEqual([{ hole_number: 1, player_id: 'p1', gross_strokes: 5, is_conceded: false }]);
  });

  it('keeps separate cells independent', () => {
    const q1 = upsertQueueEntry([], { hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false });
    const q2 = upsertQueueEntry(q1, { hole_number: 1, player_id: 'p2', gross_strokes: 5, is_conceded: false });
    expect(q2).toHaveLength(2);
  });

  it('removes entries that match exactly what was sent', () => {
    const queue = [
      { hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false },
      { hole_number: 2, player_id: 'p1', gross_strokes: 5, is_conceded: false },
    ];
    const sent = [{ hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false }];
    expect(removeSentEntries(queue, sent)).toEqual([
      { hole_number: 2, player_id: 'p1', gross_strokes: 5, is_conceded: false },
    ]);
  });

  it('leaves a cell queued when a newer tap changed it during the flush', () => {
    const sent = [{ hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false }];
    const queueAfterNewerTap = [{ hole_number: 1, player_id: 'p1', gross_strokes: 7, is_conceded: false }];
    expect(removeSentEntries(queueAfterNewerTap, sent)).toEqual(queueAfterNewerTap);
  });

  it('removes a single cell outright regardless of its queued value', () => {
    const queue = [
      { hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false },
      { hole_number: 1, player_id: 'p2', gross_strokes: 5, is_conceded: false },
    ];
    expect(removeQueueEntry(queue, { hole_number: 1, player_id: 'p1' })).toEqual([
      { hole_number: 1, player_id: 'p2', gross_strokes: 5, is_conceded: false },
    ]);
  });
});
