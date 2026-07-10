/** Calendar date helpers that avoid UTC timezone shifts from `Date` / `toISOString()`. */

export type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

/** Parse `YYYY-MM-DD` (or ISO prefix) into local calendar parts — never via `new Date(string)`. */
export function parseDateOnly(value: string | null | undefined): DateOnlyParts | null {
  if (!value) return null;
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return null;
  return { year, month, day };
}

/** Build `YYYY-MM-DD` without timezone conversion. */
export function formatDateOnly(year: number, month: number, day: number): string {
  const safeDay = clampDay(year, month, day);
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function formatDateOnlyDisplay(value: string, lang: 'vi' | 'en'): string {
  const parts = parseDateOnly(value);
  if (!parts) return value;
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  return lang === 'vi' ? `${dd}/${mm}/${parts.year}` : `${mm}/${dd}/${parts.year}`;
}

export function defaultDateOnlyParts(fallbackYear = 2000): DateOnlyParts {
  return { year: fallbackYear, month: 1, day: 1 };
}
