import type { CeremonyAwardKey } from '@/types/database';

export type CeremonyAwardOption = {
  key: CeremonyAwardKey;
  label: string;
  description: string;
};

export const AWARD_OPTIONS: readonly CeremonyAwardOption[] = [
  {
    key: 'davey_jones_locker',
    label: "Davey Jones' Locker",
    description: 'Awarded for the most buffoonery or drunkenness.',
  },
  {
    key: 'matt_leinart',
    label: 'Matt Leinart Award',
    description: 'Awarded for the biggest disappointment.',
  },
] as const;

const AWARD_KEYS = new Set<CeremonyAwardKey>(AWARD_OPTIONS.map((o) => o.key));

export function isCeremonyAwardKey(value: string): value is CeremonyAwardKey {
  return AWARD_KEYS.has(value as CeremonyAwardKey);
}

export function ceremonyAwardLabel(key: CeremonyAwardKey): string {
  return AWARD_OPTIONS.find((o) => o.key === key)?.label ?? key;
}
