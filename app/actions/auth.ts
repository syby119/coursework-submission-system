"use server";

import { redirect } from "next/navigation";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByStudentNumber } from "@/lib/db/users";

export type LoginState = { error?: string };

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
