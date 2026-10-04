import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Standalone Supabase admin client for E2E cleanup/assertions. Deliberately does NOT import
 * from src/lib/supabaseAdmin.ts -- e2e/ has zero runtime coupling to app source, it only
 * drives the app through the browser and talks to the database directly for setup/teardown.
 *
 * Both E2E_TARGET modes test against the SAME test Supabase project -- 'local' mode only
 * changes which instance of the Next.js app Playwright drives, not which database. So there
 * is exactly one set of Supabase credentials here, read from .env.e2e.local (populated via
 * playwright.config.ts's dotenv.config() call, which runs before this module is imported).
 */
let cachedClient: SupabaseClient | null = null;

export function getE2ESupabaseAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.E2E_SUPABASE_URL;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin credentials for E2E cleanup/assertions. Populate E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY in .env.e2e.local (see .env.e2e.example).',
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}
