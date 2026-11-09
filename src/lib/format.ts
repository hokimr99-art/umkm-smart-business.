export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiah.format(Number.isFinite(amount) ? amount : 0);
}

/** Formats a date in the store's time zone (never UTC), e.g. "9 Nov 2026". */
export function formatDate(value: string | Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(d);
}

export function formatDateTime(value: string | Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone,
  }).format(d);
}

/** Calendar date (YYYY-MM-DD) in the given time zone — used for "today" logic. */
export function localDateKey(value: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(value);
}
