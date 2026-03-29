import {
  buildTeeTimeBoardModel,
  collectUniqueTeeTimeSlots,
  compareTeeTimeSlots,
  groupMatchesBySlotId,
  parseSlotId,
  slotIdFromSpec,
} from '../matchSetupBoard';

function m(
  id: string,
  match_time: string | null,
  group_number: number | null,
  match_number: number,
) {
  return { id, match_time, group_number, match_number };
}

describe('matchSetupBoard', () => {
  describe('slotIdFromSpec / parseSlotId', () => {
    it('round-trips scheduled time and group', () => {
      const spec = { match_time: '09:00:00', group_number: 2 };
      const id = slotIdFromSpec(spec);
      expect(id).toBe('slot:09:00:00|2');
      expect(parseSlotId(id)).toEqual(spec);
    });

    it('round-trips unscheduled (null time and group)', () => {
      const spec = { match_time: null, group_number: null };
      const id = slotIdFromSpec(spec);
      expect(parseSlotId(id)).toEqual(spec);
    });
  });

  describe('compareTeeTimeSlots', () => {
    it('orders by time then group; unscheduled last', () => {
      const slots = [
        { match_time: null, group_number: null },
        { match_time: '09:10:00', group_number: 1 },
        { match_time: '09:00:00', group_number: 2 },
        { match_time: '09:00:00', group_number: 1 },
      ].sort(compareTeeTimeSlots);

      expect(slots.map((s) => s.match_time)).toEqual([
        '09:00:00',
        '09:00:00',
        '09:10:00',
        null,
      ]);
      expect(slots.map((s) => s.group_number)).toEqual([1, 2, 1, null]);
    });
  });

  describe('collectUniqueTeeTimeSlots', () => {
    it('dedupes by slot identity', () => {
      const specs = collectUniqueTeeTimeSlots([
        { match_time: '09:00:00', group_number: 1 },
        { match_time: '09:00:00', group_number: 1 },
        { match_time: '09:10:00', group_number: 1 },
      ]);
      expect(specs).toHaveLength(2);
    });
  });

  describe('groupMatchesBySlotId', () => {
    it('buckets matches and sorts by match_number within slot', () => {
      const map = groupMatchesBySlotId([
        m('a', '09:00:00', 1, 2),
        m('b', '09:00:00', 1, 1),
        m('c', '09:10:00', 1, 1),
      ]);
      expect(map.get('slot:09:00:00|1')?.map((x) => x.id)).toEqual(['b', 'a']);
      expect(map.get('slot:09:10:00|1')?.map((x) => x.id)).toEqual(['c']);
    });
  });

  describe('buildTeeTimeBoardModel', () => {
    it('returns sorted slots and grouped matches for a course', () => {
      const { slots, bySlotId } = buildTeeTimeBoardModel([
        m('x', null, null, 1),
        m('y', '09:00:00', 1, 1),
      ]);
      expect(slots.map((s) => slotIdFromSpec(s))).toEqual([
        'slot:09:00:00|1',
        'slot:null|null',
      ]);
      expect(bySlotId.get('slot:null|null')?.map((z) => z.id)).toEqual(['x']);
      expect(bySlotId.get('slot:09:00:00|1')?.map((z) => z.id)).toEqual(['y']);
    });

    it('adds an empty unscheduled column when all matches have a tee time', () => {
      const { slots, bySlotId } = buildTeeTimeBoardModel([m('y', '09:00:00', 1, 1)]);
      expect(slots.map((s) => slotIdFromSpec(s))).toEqual(['slot:09:00:00|1', 'slot:null|null']);
      expect(bySlotId.get('slot:null|null')).toBeUndefined();
    });
  });
});
