import Link from "next/link";
import { deleteStudentAction } from "@/app/actions/students";
import { t, type Locale } from "@/lib/i18n";
import type { User } from "@/types/database";

export function DeleteStudentDialog({ student, closeHref, locale }: { student: User; closeHref: string; locale: Locale }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-student-title">
      <Link href={closeHref} className="absolute inset-0 bg-slate-950/40" aria-label={t(locale, "closeDialog", { title: t(locale, "deleteStudent") })} />
      <section className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <h2 id="delete-student-title" className="text-lg font-semibold text-slate-900">{t(locale, "deleteStudent")}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{t(locale, "deleteStudentConfirmation", { name: student.name, studentNumber: student.student_number })}</p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Link href={closeHref} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t(locale, "cancel")}</Link>
          <form action={deleteStudentAction.bind(null, student.id)}>
            <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">{t(locale, "deleteStudent")}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
