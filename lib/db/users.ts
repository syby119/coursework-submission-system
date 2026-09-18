import { query, transaction } from "@/lib/db";
import type { AppRole, User } from "@/types/database";

export type UserWithPassword = User & { password_hash: string };
export type CurrentUser = Pick<User, "id" | "student_number" | "name" | "role">;

export type NewStudent = {
  studentNumber: string;
  name: string;
  passwordHash: string;
};

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

export async function listStudents() {
  const { rows } = await query<User>(
    "select id, student_number, name, role, created_at, updated_at from users where role = 'student' order by student_number asc",
  );
  return rows;
}

export async function createStudent(student: NewStudent) {
  const { rows } = await query<User>(
    `insert into users (student_number, name, password_hash, role)
     values ($1, $2, $3, 'student')
     returning id, student_number, name, role, created_at, updated_at`,
    [student.studentNumber, student.name, student.passwordHash],
  );
  return rows[0];
}

export async function createStudents(students: NewStudent[]) {
  return transaction(async (client) => {
    const studentNumbers = students.map((student) => student.studentNumber);
    const { rows: existing } = await client.query<{ student_number: string }>(
      "select student_number from users where student_number = any($1::text[])",
      [studentNumbers],
    );
    if (existing.length) return { existingStudentNumbers: existing.map((student) => student.student_number) };

    for (const student of students) {
      await client.query(
        "insert into users (student_number, name, password_hash, role) values ($1, $2, $3, 'student')",
        [student.studentNumber, student.name, student.passwordHash],
      );
    }
    return { existingStudentNumbers: [] };
  });
}

export async function deleteStudent(studentId: string) {
  return transaction(async (client) => {
    const { rows: students } = await client.query<{ id: string }>(
      "select id from users where id = $1 and role = 'student' for update",
      [studentId],
    );
    if (!students[0]) return { deleted: false, paths: [] };

    const { rows: submissions } = await client.query<{ storage_path: string }>(
      "select storage_path from submissions where student_id = $1",
      [studentId],
    );
    await client.query("delete from users where id = $1 and role = 'student'", [studentId]);
    return { deleted: true, paths: submissions.map((submission) => submission.storage_path) };
  });
}

export function isRole(value: string): value is AppRole {
  return value === "student" || value === "admin";
}
