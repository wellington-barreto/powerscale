import { createClient } from '@supabase/supabase-js';

// Keep module importable even when an environment variable is missing so
// /api/debug/config can explain the configuration instead of the Function
// crashing during startup. Real Supabase calls will still fail until the
// required variables are configured.
const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const anonKey = process.env.SUPABASE_ANON_KEY || 'missing-anon-key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-role-key';

export const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
