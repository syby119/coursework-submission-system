import Link from "next/link";
import { AssignmentForm } from "@/components/admin/assignment-form";
import { t, type Locale } from "@/lib/i18n";
import type { Assignment } from "@/types/database";

type AssignmentDialogProps = {
  title: string;
  assignment?: Assignment;
  closeHref: string;
  error?: string;
  errorPath?: string;
  successPath?: string;
  locale: Locale;
};

export function AssignmentDialog({
  title,
  assignment,
  closeHref,
  error,
  errorPath,
  successPath,
  locale,
}: AssignmentDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title">
      <Link href={closeHref} className="absolute inset-0 bg-slate-950/40" aria-label={t(locale, "closeDialog", { title })} />
      <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="assignment-dialog-title" className="text-lg font-semibold text-slate-900">{title}</h2>
          <Link href={closeHref} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={t(locale, "closeDialog", { title })}>
            <span aria-hidden="true">×</span>
          </Link>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <AssignmentForm
            assignment={assignment}
            cancelHref={closeHref}
            errorPath={errorPath}
            successPath={successPath}
            locale={locale}
          />
        </div>
      </section>
    </div>
  );
}
