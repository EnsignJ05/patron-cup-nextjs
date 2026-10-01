import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Routes reachable without authentication. Keep in sync with src/middleware.ts's matcher:
// anything NOT matched there is public and must never request all player columns.
// (TEST_ENVIRONMENT_PLAN.md Part II, Task S2/S3 -- this is the test that would have caught
// the original PII exposure before it shipped.)
const PUBLIC_ROUTE_DIRS = [
  'src/app/roster',
  'src/app/teams',
  'src/app/matches',
  'src/app/scoreboard',
  'src/app/itinerary',
  'src/app/tee-times',
];

const BANNED = [
  /players\s*\(\s*\*\s*\)/, // nested embed: player:players(*)
  /from\(\s*'players'\s*\)[\s\S]{0,120}?select\(\s*'\*'/, // from('players').select('*')
];

function walk(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('anon-reachable pages never request all player columns', () => {
  const files = PUBLIC_ROUTE_DIRS.flatMap((dir) => walk(dir));

  it('found files to check', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s', (file) => {
    const source = readFileSync(file, 'utf8');
    BANNED.forEach((pattern) => expect(source).not.toMatch(pattern));
  });
});
