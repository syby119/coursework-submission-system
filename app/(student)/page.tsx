import { AssignmentList } from "@/components/assignments/assignment-list";
import { requireStudent } from "@/lib/auth/guards";
import { listPublishedAssignments } from "@/lib/db/assignments";
import { listStudentSubmissions } from "@/lib/db/submissions";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function StudentHomePage() {
  const profile = await requireStudent();
  const locale = await getLocale();
  const [assignments, submissions] = await Promise.all([
    listPublishedAssignments(),
    listStudentSubmissions(profile.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-7">
        <p className="text-sm font-medium text-indigo-700">{t(locale, "studentHome")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{t(locale, "myAssignments")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t(locale, "timezoneNotice")}</p>
      </div>
      <AssignmentList assignments={assignments} submissions={submissions} locale={locale} />
    </main>
  );
}
