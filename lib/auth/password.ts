import bcrypt from "bcryptjs";
import { DEFAULT_LOCALE, t, type Locale } from "../i18n";

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function validateNewPassword(currentPassword: string, newPassword: string, confirmation: string, locale: Locale = DEFAULT_LOCALE) {
  if (!currentPassword || !newPassword || !confirmation) return t(locale, "fillPasswordFields");
  if (newPassword !== confirmation) return t(locale, "passwordConfirmationMismatch");
  if (newPassword === currentPassword) return t(locale, "passwordSame");
  return null;
}
