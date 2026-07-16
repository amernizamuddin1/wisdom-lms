import { describe, it, expect } from "vitest";
import { getDateKeyForUser, getHourForUser, isWeekendForUser, previousDateKey } from "./timezone";

describe("getDateKeyForUser", () => {
  it("rolls over to the next local day for a late UTC evening in IST", () => {
    // 2026-01-01T20:00:00Z is 2026-01-02 01:30 IST (UTC+5:30).
    const date = new Date("2026-01-01T20:00:00Z");
    expect(getDateKeyForUser(date, "Asia/Kolkata")).toBe("2026-01-02");
  });

  it("does not roll over for a UTC morning moment in IST", () => {
    const date = new Date("2026-01-01T03:00:00Z"); // 08:30 IST, same day
    expect(getDateKeyForUser(date, "Asia/Kolkata")).toBe("2026-01-01");
  });

  it("matches the UTC date directly when timezone is UTC", () => {
    const date = new Date("2026-01-01T23:59:00Z");
    expect(getDateKeyForUser(date, "UTC")).toBe("2026-01-01");
  });
});

describe("previousDateKey", () => {
  it("steps back one day", () => {
    expect(previousDateKey("2026-03-01")).toBe("2026-02-28");
  });
  it("handles year boundaries", () => {
    expect(previousDateKey("2026-01-01")).toBe("2025-12-31");
  });
  it("handles leap years", () => {
    expect(previousDateKey("2024-03-01")).toBe("2024-02-29");
  });
});

describe("getHourForUser", () => {
  it("converts a UTC hour to the correct IST local hour", () => {
    const date = new Date("2026-01-01T18:35:00Z"); // 00:05 IST the next day
    expect(getHourForUser(date, "Asia/Kolkata")).toBe(0);
  });
});

describe("isWeekendForUser", () => {
  // 2000-01-01 was a Saturday.
  it("identifies a Saturday as a weekend", () => {
    expect(isWeekendForUser(new Date("2000-01-01T12:00:00Z"), "UTC")).toBe(true);
  });
  it("identifies a Sunday as a weekend", () => {
    expect(isWeekendForUser(new Date("2000-01-02T12:00:00Z"), "UTC")).toBe(true);
  });
  it("identifies a Monday as a weekday", () => {
    expect(isWeekendForUser(new Date("2000-01-03T12:00:00Z"), "UTC")).toBe(false);
  });
});
