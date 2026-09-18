import { query } from "@/lib/db";
import type { AppRole, User } from "@/types/database";

export type UserWithPassword = User & { password_hash: string };
export type CurrentUser = Pick<User, "id" | "student_number" | "name" | "role">;

export async function findUserByStudentNumber(studentNumber: string) {
  const { rows } = await query<UserWithPassword>(
    "select id, student_number, name, role, password_hash, created_at, updated_at from users where student_number = $1",
    [studentNumber],
  );
  return rows[0] ?? null;
}

export async function findUserWithPasswordById(userId: string) {
  const { rows } = await query<UserWithPassword>(
    "select id, student_number, name, role, password_hash, created_at, updated_at from users where id = $1",
    [userId],
  );
  return rows[0] ?? null;
}

export async function findSessionUser(tokenHash: string) {
  const { rows } = await query<CurrentUser>(
    `select u.id, u.student_number, u.name, u.role
     from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function deleteExpiredSession(tokenHash: string) {
  await query("delete from sessions where token_hash = $1 and expires_at <= now()", [tokenHash]);
}

export function isRole(value: string): value is AppRole {
  return value === "student" || value === "admin";
}
