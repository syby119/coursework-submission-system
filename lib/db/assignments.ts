import { query, transaction } from "@/lib/db";
import type { Assignment } from "@/types/database";

export type AssignmentInput = Pick<Assignment, "title" | "description" | "published_at" | "deadline">;

export async function listPublishedAssignments() {
  const { rows } = await query<Assignment>("select * from assignments where published_at <= now() order by deadline asc");
  return rows;
}

export async function listAllAssignments() {
  const { rows } = await query<Assignment>("select * from assignments order by deadline asc");
  return rows;
}

export async function findPublishedAssignment(id: string) {
  const { rows } = await query<Assignment>("select * from assignments where id = $1 and published_at <= now()", [id]);
  return rows[0] ?? null;
}

export async function findAssignment(id: string) {
  const { rows } = await query<Assignment>("select * from assignments where id = $1", [id]);
  return rows[0] ?? null;
}

export async function findAssignmentByTitle(title: string) {
  const { rows } = await query<Assignment>("select * from assignments where title = $1", [title]);
  return rows[0] ?? null;
}

export async function createAssignment(input: AssignmentInput, createdBy: string) {
  const { rows } = await query<Assignment>(
    `insert into assignments (title, description, published_at, deadline, created_by)
     values ($1, $2, $3, $4, $5) returning *`,
    [input.title, input.description, input.published_at, input.deadline, createdBy],
  );
  return rows[0];
}

export async function updateAssignment(id: string, input: AssignmentInput) {
  const { rows } = await query<Assignment>(
    `update assignments set title = $1, description = $2, published_at = $3, deadline = $4
     where id = $5 returning *`,
    [input.title, input.description, input.published_at, input.deadline, id],
  );
  return rows[0] ?? null;
}

export async function deleteAssignment(id: string) {
  return transaction(async (client) => {
    const { rows: submissions } = await client.query<{ storage_path: string }>(
      "select storage_path from submissions where assignment_id = $1",
      [id],
    );
    const { rowCount } = await client.query("delete from assignments where id = $1", [id]);
    return { deleted: rowCount === 1, paths: submissions.map((submission) => submission.storage_path) };
  });
}
