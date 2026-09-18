import Link from "next/link";
import { createStudentAction } from "@/app/actions/students";
import { t, type Locale } from "@/lib/i18n";

export function CreateStudentDialog({ closeHref, error, locale }: { closeHref: string; error?: string; locale: Locale }) {
  const title = t(locale, "addStudent");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-student-title">
      <Link href={closeHref} className="absolute inset-0 bg-slate-950/40" aria-label={t(locale, "closeDialog", { title })} />
      <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="create-student-title" className="text-lg font-semibold text-slate-900">{title}</h2>
          <Link href={closeHref} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={t(locale, "closeDialog", { title })}><span aria-hidden="true">×</span></Link>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <p className="mb-5 text-sm leading-6 text-slate-600">{t(locale, "studentInitialPasswordNotice", { password: "123456" })}</p>
          <form action={createStudentAction.bind(null, "/admin/students?create=1", "/admin/students")} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {t(locale, "studentNumber")}
              <input name="student_number" required maxLength={64} autoComplete="off" className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {t(locale, "student")}
              <input name="name" required maxLength={100} autoComplete="off" className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
              <Link href={closeHref} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t(locale, "cancel")}</Link>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{t(locale, "addStudent")}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
