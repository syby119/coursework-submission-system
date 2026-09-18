"use server";

import { redirect } from "next/navigation";
import { changePasswordAndRotateSessions, createSession, destroyCurrentSession } from "@/lib/auth/session";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserByStudentNumber, findUserWithPasswordById } from "@/lib/db/users";

export type LoginState = { error?: string };
export type ChangePasswordState = { error?: string; success?: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!studentNumber || !password) return { error: "请输入用户名和密码。" };

  const user = await findUserByStudentNumber(studentNumber);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "用户名或密码不正确。" };
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
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/admin");

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmation = String(formData.get("new_password_confirmation") ?? "");
  const validationError = validateNewPassword(currentPassword, newPassword, confirmation);
  if (validationError) return { error: validationError };

  const account = await findUserWithPasswordById(user.id);
  if (!account || !(await verifyPassword(currentPassword, account.password_hash))) {
    return { error: "当前密码不正确。" };
  }

  try {
    await changePasswordAndRotateSessions(user.id, await hashPassword(newPassword));
  } catch (error) {
    console.error("Password change failed", error);
    return { error: "密码修改失败，请稍后重试。" };
  }

  return { success: "密码已修改。其他设备上的登录已失效。" };
}
