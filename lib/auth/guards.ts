import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type AuthenticatedProfile = Pick<Profile, "id" | "name" | "role" | "student_number">;

export async function getCurrentProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, name, role, student_number")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

export async function requireStudent() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");
  return profile;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");
  return profile;
}
