/**
 * Day calculations for the warmup schedule.
 *
 * All day boundaries are anchored to Europe/Tbilisi (UTC+4), so the user's
 * "today" matches the dashboard regardless of where the server is hosted.
 *
 * Day number is computed monotonically from warmupStartedAt — never
 * incremented one-step-at-a-time. This means if cron misses ticks, the
 * domain catches up to the correct day automatically.
 */

const TZ = "Europe/Tbilisi";

/**
 * Return YYYY-MM-DD for the date in Tbilisi time.
 */
export function tbilisiDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Whole calendar days between two YYYY-MM-DD strings (later − earlier).
 */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00Z`).getTime();
  const to = new Date(`${toKey}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Day number (1-indexed) given a start date and the current time.
 * Returns 0 if warmup hasn't started yet.
 */
export function getCurrentWarmupDay(startedAt: Date | null, now: Date = new Date()): number {
  if (!startedAt) return 0;
  const startKey = tbilisiDayKey(startedAt);
  const todayKey = tbilisiDayKey(now);
  const diff = daysBetweenKeys(startKey, todayKey);
  return diff + 1; // day 1 = same calendar day as start
}

/**
 * Should the daily-sent counter be reset?
 * Reset whenever the last-sent timestamp is on a different Tbilisi calendar
 * day from now.
 */
export function shouldResetDailyCounter(
  lastSentAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!lastSentAt) return false;
  return tbilisiDayKey(lastSentAt) !== tbilisiDayKey(now);
}
