import type { Assignment, Submission } from "@/types/database";
import { AssignmentCard } from "./assignment-card";

export function AssignmentList({ assignments, submissions }: { assignments: Assignment[]; submissions: Submission[] }) {
  const byAssignment = new Map(submissions.map((submission) => [submission.assignment_id, submission]));
  if (!assignments.length) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">目前还没有已发布的作业。</div>;
  }
  return <div className="grid gap-4">{assignments.map((assignment) => <AssignmentCard assignment={assignment} key={assignment.id} submission={byAssignment.get(assignment.id)} />)}</div>;
}
