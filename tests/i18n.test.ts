import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, localeFromValue, t } from "../lib/i18n";
import { formatDateTime } from "../lib/time";

describe("localization", () => {
  it("uses Chinese by default and rejects unsupported locale values", () => {
    expect(localeFromValue(undefined)).toBe(DEFAULT_LOCALE);
    expect(localeFromValue("fr")).toBe(DEFAULT_LOCALE);
    expect(t("zh-CN", "myAssignments")).toBe("我的作业");
  });

  it("returns translated strings with interpolated values", () => {
    expect(t("en", "submittedCount", { count: 3 })).toBe("Submitted: 3");
    expect(t("en", "assignmentTitleDuplicate", { action: "create", title: "Essay" })).toContain("Essay");
  });

  it("formats displayed dates using the selected language", () => {
    const value = "2026-09-18T12:00:00.000Z";
    expect(formatDateTime(value, "zh-CN")).toMatch(/2026/);
    expect(formatDateTime(value, "en")).toMatch(/18\/09\/2026/);
  });
});
