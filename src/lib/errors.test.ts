import { describe, expect, it } from 'vitest';
import { GENERIC_ERROR, toUserMessage } from './errors';

describe('toUserMessage', () => {
  it('maps RPC error codes', () => {
    expect(toUserMessage({ message: 'SLUG_TAKEN' })).toMatch(/sudah dipakai/);
    expect(toUserMessage(new Error('LAST_OWNER'))).toMatch(/Pemilik terakhir/);
  });
  it('maps Supabase auth messages', () => {
    expect(toUserMessage({ message: 'Invalid login credentials' })).toBe('Email atau kata sandi salah.');
    expect(toUserMessage(new TypeError('Failed to fetch'))).toMatch(/koneksi internet/);
  });
  it('maps database permission errors', () => {
    expect(toUserMessage({ message: 'permission denied for table stores' })).toMatch(/izin/);
  });
  it('hides unknown internal errors', () => {
    expect(toUserMessage({ message: 'relation "x" does not exist' })).toBe(GENERIC_ERROR);
    expect(toUserMessage(null)).toBe(GENERIC_ERROR);
  });
});
