const invalidArchiveCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f\u2044\u2215]/g;

/**
 * Converts user-supplied labels into one safe ZIP path segment. ZIP entry paths
 * are never used as filesystem paths, but keeping them path-safe prevents a
 * malicious name from creating unexpected directories when an archive is
 * extracted.
 */
export function archivePathSegment(value: string, fallback: string) {
  const sanitized = value
    .normalize("NFKC")
    .replace(invalidArchiveCharacters, "_")
    .trim()
    .slice(0, 100);

  if (!sanitized || /^\.+$/.test(sanitized)) return fallback;
  return sanitized;
}

export function assignmentArchiveFilename(title: string, locale: Locale = DEFAULT_LOCALE) {
  return `${assignmentArchiveDirectory(title, locale)}.zip`;
}

export function assignmentGradeFilename(title: string, locale: Locale = DEFAULT_LOCALE) {
  return `${assignmentArchiveDirectory(title, locale)}-${t(locale, "archiveGrades")}.xlsx`;
}

export function allAssignmentsArchiveDirectory(locale: Locale = DEFAULT_LOCALE) {
  return t(locale, "archiveAllAssignmentsAndGrades");
}

export function allAssignmentsArchiveFilename(locale: Locale = DEFAULT_LOCALE) {
  return `${allAssignmentsArchiveDirectory(locale)}.zip`;
}

export function assignmentArchiveDirectory(title: string, locale: Locale = DEFAULT_LOCALE) {
  return archivePathSegment(title, t(locale, "archiveAssignmentFallback"));
}

export function studentArchiveDirectory(studentNumber: string, studentName: string, locale: Locale = DEFAULT_LOCALE) {
  const number = archivePathSegment(studentNumber, t(locale, "archiveUnknownStudentNumber"));
  const name = archivePathSegment(studentName, t(locale, "archiveUnnamedStudent"));
  return `${number}_${name}`;
}
import { DEFAULT_LOCALE, t, type Locale } from "../i18n";
