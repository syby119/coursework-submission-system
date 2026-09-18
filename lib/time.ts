import { DEFAULT_LOCALE, type Locale } from "./i18n";

const DISPLAY_TIME_ZONE = "Asia/Shanghai";

export function formatDateTime(isoDate: string, locale: Locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "zh-CN", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

export function formatDateTimeLocal(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoDate));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function parseShanghaiDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+08:00`);
  if (Number.isNaN(date.getTime()) || formatDateTimeLocal(date.toISOString()) !== value) return null;
  return date.toISOString();
}

export function isPastDeadline(deadline: string) {
  return new Date(deadline).getTime() <= Date.now();
}

export function isLateSubmission(submittedAt: string, deadline: string) {
  return new Date(submittedAt).getTime() > new Date(deadline).getTime();
}
