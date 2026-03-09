// Warmup schedule: 2-week progressive ramp-up
// Day -> Daily email limit
export const WARMUP_SCHEDULE: Record<number, number> = {
  1: 2,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 10,
  10: 12,
  11: 14,
  12: 16,
  13: 18,
  14: 20,
};

export const WARMUP_DURATION_DAYS = 14;
export const WARMUP_TOTAL_EMAILS = Object.values(WARMUP_SCHEDULE).reduce(
  (sum, limit) => sum + limit,
  0
); // ~127 emails per domain

export function getDailyLimit(day: number): number {
  if (day < 1) return 0;
  if (day > WARMUP_DURATION_DAYS) return WARMUP_SCHEDULE[WARMUP_DURATION_DAYS];
  return WARMUP_SCHEDULE[day] ?? 0;
}

export function isWarmupComplete(day: number): boolean {
  return day > WARMUP_DURATION_DAYS;
}

export function getWarmupProgress(day: number): number {
  if (day < 1) return 0;
  if (day > WARMUP_DURATION_DAYS) return 100;
  return Math.round((day / WARMUP_DURATION_DAYS) * 100);
}

export function getTotalSentUpToDay(day: number): number {
  let total = 0;
  for (let d = 1; d <= Math.min(day, WARMUP_DURATION_DAYS); d++) {
    total += WARMUP_SCHEDULE[d] ?? 0;
  }
  return total;
}
