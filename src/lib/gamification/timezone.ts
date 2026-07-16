import "server-only";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/** Returns the YYYY-MM-DD date key for `date` as seen in `timezone`. */
export function getDateKeyForUser(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/** Returns the local hour (0-23) for `date` as seen in `timezone`. */
export function getHourForUser(date: Date, timezone: string): number {
  return Number(formatInTimeZone(date, timezone, "H"));
}

/** True if `date`, as seen in `timezone`, falls on a Saturday or Sunday. */
export function isWeekendForUser(date: Date, timezone: string): boolean {
  const zoned = toZonedTime(date, timezone);
  const day = zoned.getDay();
  return day === 0 || day === 6;
}

/** Returns the date key immediately before `dateKey` (both YYYY-MM-DD) — pure calendar math, no timezone needed since both keys already represent the same zone. */
export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
