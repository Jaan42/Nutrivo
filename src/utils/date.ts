const padDatePart = (value: number) => String(value).padStart(2, '0');

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
