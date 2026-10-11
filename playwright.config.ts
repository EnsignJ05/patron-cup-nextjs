import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// This is the ONLY env file this config ever reads -- it deliberately does NOT fall back to
// .env.local or .env, since .env.local currently points at the PRODUCTION Supabase project
// (see AGENTS.md's Environments table). Mixing that up with this file would mean "invasive"
// E2E tests running against real production data.
dotenv.config({ path: path.resolve(__dirname, '.env.e2e.local') });

const target = process.env.E2E_TARGET === 'local' ? 'local' : 'deployed';

const DEPLOYED_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.patron-cup.com';
const LOCAL_BASE_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  outputDir: './test-results',

  use: {
    baseURL: target === 'local' ? LOCAL_BASE_URL : DEPLOYED_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Only spin up a local server in local mode. In deployed mode there is no webServer block
  // at all, so Playwright never tries to boot anything and always hits the real site.
  webServer:
    target === 'local'
      ? {
          command: 'npm run build && npm run start',
          url: LOCAL_BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            // Explicit allow-list, NOT a process.env passthrough. This is the single
            // safety-critical line in this file: it guarantees local mode can never
            // silently inherit .env.local's prod-pointing values, since the spawned
            // `next start` process only ever sees these three keys as set here. Same test
            // project credentials used everywhere else in this config (see
            // e2e/support/supabaseAdminE2E.ts) -- 'local' mode only changes which Next.js
            // instance Playwright drives, never which database.
            NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? '',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY ?? '',
            SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? '',
          },
        }
      : undefined,

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'public-chromium',
      testDir: './e2e/public',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'public-mobile',
      testDir: './e2e/public',
      use: { ...devices['iPhone 13'] },
    },

    {
      name: 'player-chromium',
      testDir: './e2e/player',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/player.json' },
      dependencies: ['setup'],
    },
    {
      name: 'player-mobile',
      testDir: './e2e/player',
      use: { ...devices['iPhone 13'], storageState: 'playwright/.auth/player.json' },
      dependencies: ['setup'],
    },

    {
      name: 'admin-chromium',
      testDir: './e2e/admin',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'admin-mobile',
      testDir: './e2e/admin',
      use: { ...devices['iPhone 13'], storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },

    // Cross-role journeys manage their own per-role browser contexts (see
    // e2e/fixtures/auth.fixtures.ts), so this project only needs a plain desktop context.
    {
      name: 'journeys',
      testDir: './e2e/journeys',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
