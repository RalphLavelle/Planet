import type { Activity, Trip } from "@/domain/schemas";

/**
 * Items in a day are shown in start-time order. Items with a time come first, earliest first; items without a time
 * come after them in the order they already had (the sort is stable, so ties keep their order too).
 */
export function compareByStart(a: Pick<Activity, "startTime">, b: Pick<Activity, "startTime">): number {
  if (a.startTime && b.startTime) return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
  if (a.startTime) return -1;
  if (b.startTime) return 1;
  return 0;
}

export const sortActivities = (list: Activity[]): Activity[] => (isInTimeOrder(list) ? list : [...list].sort(compareByStart));
export const isInTimeOrder = (list: Pick<Activity, "startTime">[]): boolean => list.every((a, i) => i === 0 || compareByStart(list[i - 1], a) <= 0);

/** The same trip with every day in time order. Returns the same object when nothing needs to move. */
export function withSortedDays<T extends Pick<Trip, "days">>(trip: T): T {
  if (trip.days.every((d) => isInTimeOrder(d.activities))) return trip;
  return { ...trip, days: trip.days.map((d) => ({ ...d, activities: sortActivities(d.activities) })) };
}
