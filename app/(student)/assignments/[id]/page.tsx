import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/submissions/download-button";
import { UploadForm } from "@/components/submissions/upload-form";
import { requireStudent } from "@/lib/auth/guards";
import { findPublishedAssignment } from "@/lib/db/assignments";
import { findStudentSubmission } from "@/lib/db/submissions";
import { formatDateTime, isLateSubmission, isPastDeadline } from "@/lib/time";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const locale = await getLocale();
  const assignment = await findPublishedAssignment(id);
  if (!assignment) notFound();
  const submission = await findStudentSubmission(id, profile.id);
  const overdue = isPastDeadline(assignment.deadline);
  const late = submission ? isLateSubmission(submission.submitted_at, assignment.deadline) : false;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">{t(locale, "backMyAssignments")}</Link>
      <p className="mt-3 text-xs text-slate-500">{t(locale, "timezoneNotice")}</p>
      <article className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm text-slate-500">{t(locale, "publishedAt")}：{formatDateTime(assignment.published_at, locale)}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{assignment.title}</h1>
        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{assignment.description || t(locale, "noAssignmentDescription")}</p>
        <div className={`mt-6 rounded-lg border p-4 ${overdue ? "border-amber-200 bg-amber-50" : "border-indigo-100 bg-indigo-50"}`}>
          <p className="font-medium text-slate-900">{t(locale, "dueTime")}：{formatDateTime(assignment.deadline, locale)}</p>
          <p className={`mt-1 text-sm ${overdue ? "text-amber-800" : "text-slate-600"}`}>{overdue ? t(locale, "lateSubmissionNotice") : t(locale, "beforeDeadlineNotice")}</p>
        </div>
      </article>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">{t(locale, "mySubmission")}</h2>
        {submission ? (
          <div className={`mt-3 rounded-lg p-4 text-sm ${late ? "bg-amber-50" : "bg-emerald-50"}`}>
            <p className={`font-medium ${late ? "text-amber-800" : "text-emerald-800"}`}>{late ? t(locale, "late") : t(locale, "submitted")}：{submission.original_filename}</p>
            <p className={`mt-1 ${late ? "text-amber-700" : "text-emerald-700"}`}>{t(locale, "lastSubmitted")}：{formatDateTime(submission.submitted_at, locale)}</p>
            <div className="mt-2"><DownloadButton submissionId={submission.id} locale={locale} /></div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-600">{t(locale, "noSubmission")}</p>}
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="font-medium text-slate-900">{submission ? t(locale, "resubmit") : t(locale, "uploadAssignment")}</h3>
          <div className="mt-3"><UploadForm assignmentId={assignment.id} disabled={false} locale={locale} /></div>
        </div>
      </section>
    </main>
  );
}
