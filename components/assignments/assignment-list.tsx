import type { Assignment, Submission } from "@/types/database";
import { t, type Locale } from "@/lib/i18n";
import { AssignmentCard } from "./assignment-card";

export function AssignmentList({ assignments, submissions, locale }: { assignments: Assignment[]; submissions: Submission[]; locale: Locale }) {
  const byAssignment = new Map(submissions.map((submission) => [submission.assignment_id, submission]));
  if (!assignments.length) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{t(locale, "noPublishedAssignments")}</div>;
  }
  return <div className="grid gap-4">{assignments.map((assignment) => <AssignmentCard assignment={assignment} key={assignment.id} locale={locale} submission={byAssignment.get(assignment.id)} />)}</div>;
}
