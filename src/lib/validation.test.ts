import { describe, expect, it } from 'vitest';
import {
  slugify,
  validateBusinessType,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
  validateSlug,
  validateStoreName,
} from './validation';

describe('validateEmail', () => {
  it('trims and lowercases a valid email', () => {
    expect(validateEmail('  Ani@Toko.ID ')).toEqual({ ok: true, value: 'ani@toko.id' });
  });
  it.each([undefined, null, 42, '', 'tanpa-at', 'a@b', 'a b@c.id'])('rejects %p', (v) => {
    expect(validateEmail(v).ok).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts letters + digits, 8+ chars', () => {
    expect(validatePassword('rahasia123').ok).toBe(true);
  });
  it.each(['pendek1', 'hanyahuruf', '12345678', 'a1'.repeat(37)])('rejects %p', (v) => {
    expect(validatePassword(v).ok).toBe(false);
  });
  it('does not trim passwords', () => {
    expect(validatePassword(' abc1234 ')).toEqual({ ok: true, value: ' abc1234 ' });
  });
});

describe('names', () => {
  it('collapses whitespace in full name', () => {
    expect(validateFullName('  Ani   Wijaya ')).toEqual({ ok: true, value: 'Ani Wijaya' });
  });
  it('rejects too short or too long store names', () => {
    expect(validateStoreName('A').ok).toBe(false);
    expect(validateStoreName('x'.repeat(101)).ok).toBe(false);
    expect(validateStoreName('Toko Ani').ok).toBe(true);
  });
  it('business type is optional', () => {
    expect(validateBusinessType('  ')).toEqual({ ok: true, value: null });
    expect(validateBusinessType('x'.repeat(51)).ok).toBe(false);
  });
});

describe('slug', () => {
  it('slugify strips accents and symbols', () => {
    expect(slugify('Kopi Ñusa & Roti 88!')).toBe('kopi-nusa-roti-88');
  });
  it('slugify returns empty when too short', () => {
    expect(slugify('!!')).toBe('');
    expect(slugify('ab')).toBe('');
  });
  it('slugify caps length at 48 without trailing dash', () => {
    const s = slugify('a'.repeat(47) + ' b');
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith('-')).toBe(false);
    expect(validateSlug(s).ok).toBe(true);
  });
  it.each(['ab', '-abc', 'abc-', 'ABC def', 'a'.repeat(49)])('validateSlug rejects %p', (v) => {
    expect(validateSlug(v).ok).toBe(false);
  });
  it('validateSlug lowercases', () => {
    expect(validateSlug('Toko-Ani')).toEqual({ ok: true, value: 'toko-ani' });
  });
});

describe('validatePhone', () => {
  it('normalizes spaces and dashes', () => {
    expect(validatePhone('0812-3456 7890')).toEqual({ ok: true, value: '081234567890' });
    expect(validatePhone('+62 812 3456 7890')).toEqual({ ok: true, value: '+6281234567890' });
  });
  it('is optional', () => {
    expect(validatePhone('')).toEqual({ ok: true, value: null });
  });
  it('rejects letters and wrong length', () => {
    expect(validatePhone('08abc').ok).toBe(false);
    expect(validatePhone('1234').ok).toBe(false);
  });
});
