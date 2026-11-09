import { describe, expect, it } from 'vitest';
import { readSupabaseConfig } from './config';

describe('readSupabaseConfig', () => {
  it('accepts https URL and key', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }))
      .toEqual({ ok: true, url: 'https://abc.supabase.co', anonKey: 'k' });
  });
  it('reports missing or placeholder values', () => {
    expect(readSupabaseConfig({})).toEqual({ ok: false, missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] });
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://evil.example', VITE_SUPABASE_ANON_KEY: 'your-anon-or-publishable-key' }))
      .toEqual({ ok: false, missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] });
  });
});
