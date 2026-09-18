"use server";

import { redirect } from "next/navigation";
import { changePasswordAndRotateSessions, createSession, destroyCurrentSession } from "@/lib/auth/session";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserByStudentNumber, findUserWithPasswordById } from "@/lib/db/users";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export type LoginState = { error?: string };
export type ChangePasswordState = { error?: string; success?: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const locale = await getLocale();
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!studentNumber || !password) return { error: t(locale, "fillUsernamePassword") };

  const user = await findUserByStudentNumber(studentNumber);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: t(locale, "invalidCredentials") };
  }
  await createSession(user.id);
  redirect(user.role === "admin" ? "/admin" : "/");
}

export async function signOutAction() {
  await destroyCurrentSession();
  redirect("/login");
}

export async function changePasswordAction(
  _: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/admin");

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmation = String(formData.get("new_password_confirmation") ?? "");
  const validationError = validateNewPassword(currentPassword, newPassword, confirmation, locale);
  if (validationError) return { error: validationError };

  const account = await findUserWithPasswordById(user.id);
  if (!account || !(await verifyPassword(currentPassword, account.password_hash))) {
    return { error: t(locale, "currentPasswordIncorrect") };
  }

  try {
    await changePasswordAndRotateSessions(user.id, await hashPassword(newPassword));
  } catch (error) {
    console.error("Password change failed", error);
    return { error: t(locale, "passwordUpdateFailed") };
  }

  return { success: t(locale, "passwordUpdateSuccess") };
}
