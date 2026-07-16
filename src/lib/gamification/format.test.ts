import { describe, it, expect } from "vitest";
import { formatDuration, formatNumber } from "./format";

describe("formatDuration", () => {
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0m");
  });
  it("formats minutes only", () => {
    expect(formatDuration(600)).toBe("10m");
  });
  it("formats whole hours with no remainder", () => {
    expect(formatDuration(7200)).toBe("2h");
  });
  it("formats hours and minutes together", () => {
    expect(formatDuration(8100)).toBe("2h 15m");
  });
});

describe("formatNumber", () => {
  it("adds thousands separators", () => {
    expect(formatNumber(2340)).toBe("2,340");
  });
  it("leaves small numbers unchanged", () => {
    expect(formatNumber(42)).toBe("42");
  });
});
