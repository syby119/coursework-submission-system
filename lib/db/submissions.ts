import { query, transaction } from "@/lib/db";
import type { Submission, User } from "@/types/database";

export async function listStudentSubmissions(studentId: string) {
  const { rows } = await query<Submission>("select * from submissions where student_id = $1", [studentId]);
  return rows;
}

export async function findStudentSubmission(assignmentId: string, studentId: string) {
  const { rows } = await query<Submission>(
    "select * from submissions where assignment_id = $1 and student_id = $2",
    [assignmentId, studentId],
  );
  return rows[0] ?? null;
}

export async function listAssignmentSubmissions(assignmentId: string) {
  const { rows } = await query<Submission>("select * from submissions where assignment_id = $1", [assignmentId]);
  return rows;
}

export async function listStudents() {
  const { rows } = await query<User>(
    "select id, student_number, name, role, created_at, updated_at from users where role = 'student' order by student_number asc",
  );
  return rows;
}

export async function replaceSubmission(input: {
  assignmentId: string;
  studentId: string;
  storagePath: string;
  originalFilename: string;
  fileSize: number;
}) {
  return transaction(async (client) => {
    const { rows: current } = await client.query<{ storage_path: string }>(
      "select storage_path from submissions where assignment_id = $1 and student_id = $2 for update",
      [input.assignmentId, input.studentId],
    );
    const { rows } = await client.query<Submission>(
      `insert into submissions (assignment_id, student_id, storage_path, original_filename, file_size, submitted_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (assignment_id, student_id) do update set
         storage_path = excluded.storage_path,
         original_filename = excluded.original_filename,
         file_size = excluded.file_size,
         submitted_at = now()
       returning *`,
      [input.assignmentId, input.studentId, input.storagePath, input.originalFilename, input.fileSize],
    );
    return { submission: rows[0], previousPath: current[0]?.storage_path ?? null };
  });
}

export async function findSubmissionForDownload(id: string) {
  const { rows } = await query<Submission>("select * from submissions where id = $1", [id]);
  return rows[0] ?? null;
}
