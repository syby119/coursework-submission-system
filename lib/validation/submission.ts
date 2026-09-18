export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["zip"] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const ALLOWED_MIME_TYPES: Record<AllowedExtension, readonly string[]> = {
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

export type FileValidation =
  | { valid: true; extension: AllowedExtension; safeFilename: string }
  | { valid: false; error: string };

export function validateSubmissionFile(filename: string, size: number, locale: Locale = DEFAULT_LOCALE): FileValidation {
  const safeFilename = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  const extension = safeFilename.split(".").pop()?.toLowerCase();

  if (!safeFilename || safeFilename.length > 255) {
    return { valid: false, error: t(locale, "invalidFilename") };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, error: t(locale, "selectNonEmptyFile") };
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: t(locale, "fileTooLarge") };
  }
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return { valid: false, error: t(locale, "zipOnly") };
  }

  return { valid: true, extension: extension as AllowedExtension, safeFilename };
}

export function hasAllowedMimeType(extension: AllowedExtension, mimeType: string) {
  return !mimeType || ALLOWED_MIME_TYPES[extension].includes(mimeType.toLowerCase());
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isSubmissionPathForUser(path: string, assignmentId: string, userId: string) {
  const parts = path.split("/");
  return (
    parts.length === 3 &&
    parts[0] === assignmentId &&
    parts[1] === userId &&
    /^[0-9a-f-]{36}\.(pdf|zip|doc|docx)$/i.test(parts[2])
  );
}
import { DEFAULT_LOCALE, t, type Locale } from "../i18n";
