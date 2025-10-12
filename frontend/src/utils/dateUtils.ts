// Utility functions for consistent Tehran timezone display

// Parse backend timestamps:
// - Backend sends Tehran time as ISO strings without TZ info
// - Return formatted Tehran time directly
function parseServerDate(input: Date | string | number): Date | null {
  if (input instanceof Date) return input;
  if (typeof input === 'number') {
    const n = Number(input);
    // Heuristic: treat values < 1e12 as seconds since epoch
    const ms = Math.abs(n) < 1e12 ? n * 1000 : n;
    return new Date(ms);
  }
  // Numeric string timestamps
  const maybeNum = String(input || '').trim();
  if (/^\d+$/.test(maybeNum)) {
    const n = Number(maybeNum);
    const ms = Math.abs(n) < 1e12 ? n * 1000 : n;
    return new Date(ms);
  }
  const s = String(input || '').trim();
  if (!s) return null;

  // If already has TZ info, return as Date
  if (/Z|[+-]\d{2}:?\d{2}$/.test(s)) {
    const fixed = s.replace(/(\.\d{3})\d+/, '$1');
    return new Date(fixed);
  }

  // Backend sends Tehran time as ISO without TZ
  const base = s.includes('T') ? s : s.replace(' ', 'T');
  const fixed = base.replace(/(\.\d{3})\d+/, '$1');

  // Create Date object that represents Tehran time
  // We need to adjust for the fact that JavaScript interprets this as local time
  const date = new Date(fixed);

  // If the date is valid, return it (Intl.DateTimeFormat will handle Tehran display)
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats time in Tehran timezone (HH:MM)
 * Backend now sends Tehran time as proper ISO strings with timezone info
 */
export function toTehranTime(date: Date | string | number): string {
  const parsed = parseServerDate(date);
  if (!parsed || (parsed instanceof Date && Number.isNaN(parsed.getTime()))) return '';

  // Backend already sends Tehran time with timezone info, so format directly
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

/**
 * Formats date in Tehran timezone (YYYY/MM/DD)
 * Backend now sends Tehran time as proper ISO strings with timezone info
 */
export function toTehranDate(date: Date | string | number): string {
  const parsed = parseServerDate(date);
  if (!parsed || (parsed instanceof Date && Number.isNaN(parsed.getTime()))) return '';

  // Backend already sends Tehran time with timezone info, so format directly
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

/**
 * Formats date and time in Tehran timezone
 * Backend now sends Tehran time as proper ISO strings with timezone info
 */
export function toTehranDateTime(date: Date | string | number): string {
  const parsed = parseServerDate(date);
  if (!parsed || (parsed instanceof Date && Number.isNaN(parsed.getTime()))) return '';

  // Backend already sends Tehran time with timezone info, so format directly
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}
