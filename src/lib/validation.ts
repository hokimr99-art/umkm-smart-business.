import { fail, ok, type Result } from './result';

// Client-side validation is for convenience only. The database enforces the
// same rules (see supabase/migrations) and is the real security boundary.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

function asTrimmedString(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

export function validateEmail(input: unknown): Result<string> {
  const v = asTrimmedString(input).toLowerCase();
  if (!v) return fail('Email wajib diisi.');
  if (v.length > 254 || !EMAIL_RE.test(v)) return fail('Format email tidak valid.');
  return ok(v);
}

export function validatePassword(input: unknown): Result<string> {
  const v = typeof input === 'string' ? input : '';
  if (v.length < 8) return fail('Kata sandi minimal 8 karakter.');
  if (v.length > 72) return fail('Kata sandi maksimal 72 karakter.');
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return fail('Kata sandi harus berisi huruf dan angka.');
  return ok(v);
}

export function validateFullName(input: unknown): Result<string> {
  const v = asTrimmedString(input).replace(/\s+/g, ' ');
  if (v.length < 2) return fail('Nama minimal 2 karakter.');
  if (v.length > 100) return fail('Nama maksimal 100 karakter.');
  return ok(v);
}

export function validateStoreName(input: unknown): Result<string> {
  const v = asTrimmedString(input).replace(/\s+/g, ' ');
  if (v.length < 2) return fail('Nama usaha minimal 2 karakter.');
  if (v.length > 100) return fail('Nama usaha maksimal 100 karakter.');
  return ok(v);
}

export function validateBusinessType(input: unknown): Result<string | null> {
  const v = asTrimmedString(input);
  if (!v) return ok(null);
  if (v.length > 50) return fail('Jenis usaha maksimal 50 karakter.');
  return ok(v);
}

export function validateSlug(input: unknown): Result<string> {
  const v = asTrimmedString(input).toLowerCase();
  if (!SLUG_RE.test(v)) {
    return fail('Alamat toko 3–48 karakter: huruf kecil, angka, atau tanda hubung, tidak diawali/diakhiri tanda hubung.');
  }
  return ok(v);
}

/** Optional phone: accepts spaces/dashes, normalizes to digits with optional leading +. */
export function validatePhone(input: unknown): Result<string | null> {
  const raw = asTrimmedString(input);
  if (!raw) return ok(null);
  const v = raw.replace(/[\s-]/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(v)) return fail('Nomor telepon 8–15 digit, boleh diawali +.');
  return ok(v);
}

/** Builds a URL-safe store address from a name, e.g. "Kopi Ñusa 88" -> "kopi-nusa-88". */
export function slugify(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return base.length >= 3 ? base : '';
}
