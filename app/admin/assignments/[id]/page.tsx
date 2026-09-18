import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentOverview } from "@/components/admin/assignment-overview";
import { AssignmentSubmissionManagement } from "@/components/admin/assignment-submission-management";
import { AssignmentDialog } from "@/components/admin/assignment-dialog";
import { requireAdmin } from "@/lib/auth/guards";
import { findAssignment } from "@/lib/db/assignments";
import { listAssignmentSubmissions, listStudents } from "@/lib/db/submissions";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

type AdminAssignmentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string; error?: string; success?: string }>;
};

export default async function AdminAssignmentPage({ params, searchParams }: AdminAssignmentPageProps) {
  const { id } = await params;
  const messages = await searchParams;
  await requireAdmin();
  const locale = await getLocale();
  const [assignment, students, submissions] = await Promise.all([
    findAssignment(id),
    listStudents(),
    listAssignmentSubmissions(id),
  ]);
  if (!assignment) notFound();
  const tab = messages.tab === "submissions" ? "submissions" : "detail";
  const basePath = `/admin/assignments/${assignment.id}`;
  const detailHref = `${basePath}?tab=detail`;
  const submissionsHref = `${basePath}?tab=submissions`;
  const editHref = `${detailHref}&edit=1`;
  const editOpen = tab === "detail" && messages.edit === "1";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">{t(locale, "backAssignmentManagement")}</Link>
      <div className="mt-4 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{assignment.title}</h1>
        <Link href={editHref} className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t(locale, "edit")}</Link>
      </div>
      <nav className="mt-6 flex border-b border-slate-200" aria-label={t(locale, "assignmentNavigation")}>
        <Link
          href={detailHref}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${tab === "detail" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
        >
          {t(locale, "assignmentDetails")}
        </Link>
        <Link
          href={submissionsHref}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${tab === "submissions" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
        >
          {t(locale, "submissions")}
        </Link>
      </nav>
      <p className="mt-3 text-xs text-slate-500">{t(locale, "timezoneNotice")}</p>
      {messages.success ? <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}
      {messages.error && !editOpen ? <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{messages.error}</p> : null}
      {tab === "detail" ? <AssignmentOverview assignment={assignment} locale={locale} /> : null}
      {tab === "submissions" ? <AssignmentSubmissionManagement assignment={assignment} students={students} submissions={submissions} locale={locale} /> : null}
      {editOpen ? (
        <AssignmentDialog
          title={t(locale, "editAssignmentDialog")}
          locale={locale}
          assignment={assignment}
          closeHref={detailHref}
          error={messages.error}
          errorPath={`${detailHref}&edit=1`}
          successPath={detailHref}
        />
      ) : null}
    </main>
  );
}
