import Link from "next/link";
import { formatDateTime, isLateSubmission, isPastDeadline } from "@/lib/time";
import { t, type Locale } from "@/lib/i18n";
import type { Assignment, Submission } from "@/types/database";

export function AssignmentCard({ assignment, submission, locale }: { assignment: Assignment; submission?: Submission; locale: Locale }) {
  const overdue = isPastDeadline(assignment.deadline);
  const late = submission ? isLateSubmission(submission.submitted_at, assignment.deadline) : false;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{assignment.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{t(locale, "deadline")}：{formatDateTime(assignment.deadline, locale)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${late ? "bg-amber-50 text-amber-700" : submission ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
          {late ? t(locale, "late") : submission ? t(locale, "submitted") : overdue ? t(locale, "overdue") : t(locale, "notSubmitted")}
        </span>
      </div>
      {submission ? <p className="mt-3 text-sm text-slate-500">{t(locale, "lastSubmitted")}：{formatDateTime(submission.submitted_at, locale)}</p> : null}
      <Link className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:text-indigo-900" href={`/assignments/${assignment.id}`}>
        {t(locale, "viewAssignment")}
      </Link>
    </article>
  );
}
