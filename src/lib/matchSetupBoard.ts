/**
 * Pure helpers for committee match setup swimlanes (tee-time columns, no match_date in keys).
 */

export type TeeTimeSlotSpec = {
  match_time: string | null;
  group_number: number | null;
};

export type MatchLikeForSlot = TeeTimeSlotSpec & {
  id: string;
  match_number: number;
};

const UNSCHEDULED_SENTINEL = 'null';

export function slotIdFromSpec(spec: TeeTimeSlotSpec): string {
  const t = spec.match_time === null ? UNSCHEDULED_SENTINEL : spec.match_time;
  const g =
    spec.group_number === null || spec.group_number === undefined
      ? UNSCHEDULED_SENTINEL
      : String(spec.group_number);
  return `slot:${t}|${g}`;
}

export function slotIdFromMatch(match: TeeTimeSlotSpec): string {
  return slotIdFromSpec(match);
}

export function parseSlotId(id: string): TeeTimeSlotSpec | null {
  if (!id.startsWith('slot:')) return null;
  const rest = id.slice(5);
  const pipe = rest.indexOf('|');
  if (pipe === -1) return null;
  const timePart = rest.slice(0, pipe);
  const groupPart = rest.slice(pipe + 1);
  return {
    match_time: timePart === UNSCHEDULED_SENTINEL ? null : timePart,
    group_number:
      groupPart === UNSCHEDULED_SENTINEL || groupPart === ''
        ? null
        : Number.isNaN(Number(groupPart))
          ? null
          : Number(groupPart),
  };
}

/** Unscheduled tee times sort last (after all clock times). */
export function compareTeeTimeSlots(a: TeeTimeSlotSpec, b: TeeTimeSlotSpec): number {
  const aUn = a.match_time === null;
  const bUn = b.match_time === null;
  if (aUn !== bUn) return aUn ? 1 : -1;

  if (!aUn && !bUn && a.match_time && b.match_time && a.match_time !== b.match_time) {
    return a.match_time.localeCompare(b.match_time);
  }

  const ag = a.group_number ?? 9999;
  const bg = b.group_number ?? 9999;
  return ag - bg;
}

export function collectUniqueTeeTimeSlots(matches: TeeTimeSlotSpec[]): TeeTimeSlotSpec[] {
  const seen = new Set<string>();
  const out: TeeTimeSlotSpec[] = [];
  for (const m of matches) {
    const id = slotIdFromSpec(m);
    if (!seen.has(id)) {
      seen.add(id);
      out.push({ match_time: m.match_time, group_number: m.group_number ?? null });
    }
  }
  return out.sort(compareTeeTimeSlots);
}

export function groupMatchesBySlotId<T extends MatchLikeForSlot>(
  matches: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const m of matches) {
    const key = slotIdFromSpec(m);
    const list = map.get(key) || [];
    list.push(m);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.match_number - b.match_number);
  }
  return map;
}

const UNSCHEDULED_SPEC: TeeTimeSlotSpec = { match_time: null, group_number: null };

/** Ensures a column exists so matches can be dragged back to “TBD”. */
export function withUnscheduledSlotIfMissing(slots: TeeTimeSlotSpec[]): TeeTimeSlotSpec[] {
  const has = slots.some((s) => s.match_time === null && s.group_number === null);
  if (has) return slots;
  return [...slots, UNSCHEDULED_SPEC].sort(compareTeeTimeSlots);
}

export function buildTeeTimeBoardModel<T extends MatchLikeForSlot>(matchesForCourse: T[]): {
  slots: TeeTimeSlotSpec[];
  bySlotId: Map<string, T[]>;
} {
  const slots = withUnscheduledSlotIfMissing(collectUniqueTeeTimeSlots(matchesForCourse));
  const bySlotId = groupMatchesBySlotId(matchesForCourse);
  return { slots, bySlotId };
}

/** Union of slot specs by id; add-only merge so empty lanes stay in the list. */
export function mergeSlotSpecs(existing: TeeTimeSlotSpec[], incoming: TeeTimeSlotSpec[]): TeeTimeSlotSpec[] {
  const seen = new Set<string>();
  const out: TeeTimeSlotSpec[] = [];
  for (const s of existing) {
    const id = slotIdFromSpec(s);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ match_time: s.match_time, group_number: s.group_number ?? null });
  }
  for (const s of incoming) {
    const id = slotIdFromSpec(s);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ match_time: s.match_time, group_number: s.group_number ?? null });
  }
  return withUnscheduledSlotIfMissing(out.sort(compareTeeTimeSlots));
}
