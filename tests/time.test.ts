import { describe, expect, it } from "vitest";
import { isLateSubmission } from "../lib/time";

describe("submission timing", () => {
  it("marks only submissions after the deadline as late", () => {
    const deadline = "2026-09-18T12:00:00.000Z";
    expect(isLateSubmission("2026-09-18T11:59:59.000Z", deadline)).toBe(false);
    expect(isLateSubmission(deadline, deadline)).toBe(false);
    expect(isLateSubmission("2026-09-18T12:00:01.000Z", deadline)).toBe(true);
  });
});
