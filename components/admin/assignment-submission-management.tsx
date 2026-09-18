import { AdminSubmissionTable } from "@/components/admin/submission-table";
import { t, type Locale } from "@/lib/i18n";
import type { Assignment, Submission, User } from "@/types/database";

export function AssignmentSubmissionManagement({
  assignment,
  students,
  submissions,
  locale,
}: {
  assignment: Assignment;
  students: User[];
  submissions: Submission[];
  locale: Locale;
}) {
  const total = students.length;
  const submitted = submissions.length;

  return (
    <section className="py-7 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t(locale, "submissions")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t(locale, "submissionBasedOnAccounts")}</p>
          <p className="mt-3 text-sm font-medium text-slate-700">{t(locale, "submittedCount", { count: submitted })}　{t(locale, "unsubmittedCount", { count: total - submitted })}　{t(locale, "totalCount", { count: total })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <a
            href={`/api/admin/assignments/${assignment.id}/export`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t(locale, "exportAllAssignmentsZip")}
          </a>
          <a
            href={`/api/admin/assignments/${assignment.id}/grades`}
            className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            {t(locale, "exportGradesExcel")}
          </a>
        </div>
      </div>
      <div className="mt-5"><AdminSubmissionTable students={students} submissions={submissions} deadline={assignment.deadline} locale={locale} /></div>
    </section>
  );
}
