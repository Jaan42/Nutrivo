const padDatePart = (value: number) => String(value).padStart(2, '0');
const LOCAL_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Returns YYYY-MM-DD using the device's local calendar date.
 *
 * This deliberately uses local date parts instead of toISOString(), which
 * converts to UTC and can assign evening entries to the wrong day.
 */
export function getLocalDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
}

/** Parses a dateKey at local noon to avoid UTC conversion and DST boundary problems. */
export function parseLocalDateKey(dateKey: string): Date | null {
  const match = LOCAL_DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function addLocalDateKeyDays(dateKey: string, dayOffset: number): string {
  const date = parseLocalDateKey(dateKey);
  if (!date || !Number.isInteger(dayOffset)) {
    throw new Error('A valid local dateKey and whole-day offset are required.');
  }

  date.setDate(date.getDate() + dayOffset);
  return getLocalDateKey(date);
}

export function getPreviousLocalDateKey(dateKey: string): string {
  return addLocalDateKeyDays(dateKey, -1);
}

export function getNextLocalDateKey(dateKey: string): string {
  return addLocalDateKeyDays(dateKey, 1);
}

/** Returns local dateKeys in chronological order, ending with the supplied local day. */
export function getRecentLocalDateKeys(
  dayCount: number,
  endDateKey = getLocalDateKey(),
): string[] {
  if (!Number.isInteger(dayCount) || dayCount <= 0) {
    throw new Error('Day count must be a positive whole number.');
  }
  if (!parseLocalDateKey(endDateKey)) {
    throw new Error('A valid ending local dateKey is required.');
  }

  return Array.from({ length: dayCount }, (_, index) =>
    addLocalDateKeyDays(endDateKey, index - (dayCount - 1)),
  );
}

export function isTodayLocalDateKey(dateKey: string, today = new Date()): boolean {
  return dateKey === getLocalDateKey(today);
}

export function formatLocalDateKey(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) return 'Unknown date';

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatLocalDashboardDate(date = new Date()): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Includes a small buffer so a timer never fires just before local midnight. */
export function millisecondsUntilNextLocalDay(date = new Date()): number {
  const nextDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    1,
  );

  return Math.max(1_000, nextDay.getTime() - date.getTime());
}
