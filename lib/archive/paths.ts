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

export function assignmentArchiveFilename(title: string) {
  return `${assignmentArchiveDirectory(title)}.zip`;
}

export function assignmentGradeFilename(title: string) {
  return `${assignmentArchiveDirectory(title)}-成绩.xlsx`;
}

export function assignmentArchiveDirectory(title: string) {
  return archivePathSegment(title, "作业");
}

export function studentArchiveDirectory(studentNumber: string, studentName: string) {
  const number = archivePathSegment(studentNumber, "未知学号");
  const name = archivePathSegment(studentName, "未命名学生");
  return `${number}_${name}`;
}
