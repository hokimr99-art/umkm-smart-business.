import { describe, expect, it } from 'vitest';
import { formatDate, formatRupiah, localDateKey } from './format';

describe('format', () => {
  it('formats rupiah without decimals', () => {
    expect(formatRupiah(25000).replace(/\s/g, ' ')).toBe('Rp 25.000');
    expect(formatRupiah(Number.NaN).replace(/\s/g, ' ')).toBe('Rp 0');
  });
  it('uses Jakarta time, not UTC (regression for demo bug T4)', () => {
    // 2026-11-08 18:30 UTC is already 9 Nov 01:30 in Jakarta.
    const d = new Date('2026-11-08T18:30:00Z');
    expect(localDateKey(d)).toBe('2026-11-09');
    expect(localDateKey(d, 'UTC')).toBe('2026-11-08');
    expect(formatDate(d)).toBe('9 Nov 2026');
  });
  it('handles invalid dates', () => {
    expect(formatDate('bukan tanggal')).toBe('-');
  });
});
