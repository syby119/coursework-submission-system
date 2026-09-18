import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CurrentUser } from "@/lib/db/users";

export type AuthenticatedUser = CurrentUser;

export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return user;
}
