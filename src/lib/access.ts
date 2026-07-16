export type DurationChoice = "3" | "6" | "9" | "12" | "custom" | "forever";

export function durationChoiceFor(accessDurationMonths: number | null): DurationChoice {
  return accessDurationMonths == null ? "forever" : (String(accessDurationMonths) as DurationChoice);
}

export interface ComputedAccess {
  accessEndAt: Date | null;
  accessDurationMonths: number | null;
  isPermanent: boolean;
}

export function computeAccess(
  startAt: Date,
  choice: DurationChoice,
  customEndDate: Date | null,
): ComputedAccess {
  if (choice === "forever") {
    return { accessEndAt: null, accessDurationMonths: null, isPermanent: true };
  }

  if (choice === "custom") {
    if (!customEndDate) {
      throw new Error("Custom end date is required.");
    }
    return { accessEndAt: customEndDate, accessDurationMonths: null, isPermanent: false };
  }

  const months = Number(choice);
  const end = new Date(startAt);
  end.setMonth(end.getMonth() + months);
  return { accessEndAt: end, accessDurationMonths: months, isPermanent: false };
}

export function isAccessExpired(
  enrollment: { isPermanent: boolean; accessEndAt: Date | null },
  now: Date = new Date(),
): boolean {
  return !enrollment.isPermanent && enrollment.accessEndAt != null && now > enrollment.accessEndAt;
}
