export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;
}

/**
 * Get sync configuration from environment variables.
 * Returns null if any required variable is missing (offline-only mode).
 */
export function getSyncConfig(): SyncConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const powersyncUrl = process.env.POWERSYNC_URL;

  if (!supabaseUrl || !supabaseAnonKey || !powersyncUrl) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, powersyncUrl };
}
