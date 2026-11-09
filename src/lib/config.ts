export type SupabaseConfig =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; missing: string[] };

/** Reads public Supabase settings. Only the URL and anon/publishable key belong here. */
export function readSupabaseConfig(env: Record<string, string | undefined>): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const missing: string[] = [];
  let validUrl = false;
  try {
    const u = new URL(url);
    validUrl = u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    validUrl = false;
  }
  if (!validUrl) missing.push('VITE_SUPABASE_URL');
  if (!anonKey || anonKey.startsWith('your-')) missing.push('VITE_SUPABASE_ANON_KEY');
  return missing.length ? { ok: false, missing } : { ok: true, url, anonKey };
}
