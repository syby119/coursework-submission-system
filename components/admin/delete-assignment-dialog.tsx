import Link from "next/link";
import { deleteAssignmentAction } from "@/app/actions/assignments";
import { t, type Locale } from "@/lib/i18n";
import type { Assignment } from "@/types/database";

export function DeleteAssignmentDialog({ assignment, closeHref, locale }: { assignment: Assignment; closeHref: string; locale: Locale }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-assignment-title">
      <Link href={closeHref} className="absolute inset-0 bg-slate-950/40" aria-label={t(locale, "closeDialog", { title: t(locale, "deleteAssignment") })} />
      <section className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <h2 id="delete-assignment-title" className="text-lg font-semibold text-slate-900">{t(locale, "deleteAssignment")}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t(locale, "deleteAssignmentConfirmation", { title: assignment.title })}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Link href={closeHref} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t(locale, "cancel")}</Link>
          <form action={deleteAssignmentAction.bind(null, assignment.id)}>
            <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">{t(locale, "deleteAssignment")}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
