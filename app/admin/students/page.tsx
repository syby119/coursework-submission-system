import Link from "next/link";
import { CreateStudentDialog } from "@/components/admin/create-student-dialog";
import { DeleteStudentDialog } from "@/components/admin/delete-student-dialog";
import { ImportStudentsDialog } from "@/components/admin/import-students-dialog";
import { StudentList } from "@/components/admin/student-list";
import { requireAdmin } from "@/lib/auth/guards";
import { listStudents } from "@/lib/db/users";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

type StudentManagementPageProps = {
  searchParams: Promise<{ create?: string; import?: string; delete?: string; error?: string; success?: string }>;
};

export default async function StudentManagementPage({ searchParams }: StudentManagementPageProps) {
  await requireAdmin();
  const locale = await getLocale();
  const messages = await searchParams;
  const students = await listStudents();
  const createOpen = messages.create === "1";
  const importOpen = !createOpen && messages.import === "1";
  const studentToDelete = !createOpen && !importOpen ? students.find((student) => student.id === messages.delete) : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t(locale, "studentManagement")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t(locale, "studentManagementIntroduction")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/students?import=1" className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">{t(locale, "importStudents")}</Link>
          <Link href="/admin/students?create=1" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">{t(locale, "addStudent")}</Link>
        </div>
      </div>
      {messages.error && !createOpen && !importOpen ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{messages.error}</p> : null}
      {messages.success ? <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{t(locale, "allStudents")}</h2>
          <p className="text-sm text-slate-500">{t(locale, "studentCount", { count: students.length })}</p>
        </div>
        <div className="mt-4"><StudentList students={students} locale={locale} /></div>
      </section>
      {createOpen ? <CreateStudentDialog closeHref="/admin/students" error={messages.error} locale={locale} /> : null}
      {importOpen ? <ImportStudentsDialog closeHref="/admin/students" error={messages.error} locale={locale} /> : null}
      {studentToDelete ? <DeleteStudentDialog student={studentToDelete} closeHref="/admin/students" locale={locale} /> : null}
    </main>
  );
}
