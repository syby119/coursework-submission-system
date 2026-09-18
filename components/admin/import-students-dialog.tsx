"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { importStudentsAction } from "@/app/actions/students";
import { t, type Locale } from "@/lib/i18n";

export function ImportStudentsDialog({ closeHref, error, locale }: { closeHref: string; error?: string; locale: Locale }) {
  const title = t(locale, "importStudents");
  const inputId = useId();
  const [filename, setFilename] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-students-title">
      <Link href={closeHref} className="absolute inset-0 bg-slate-950/40" aria-label={t(locale, "closeDialog", { title })} />
      <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="import-students-title" className="text-lg font-semibold text-slate-900">{title}</h2>
          <Link href={closeHref} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={t(locale, "closeDialog", { title })}><span aria-hidden="true">×</span></Link>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <p className="text-sm leading-6 text-slate-600">{t(locale, "studentImportInstructions")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t(locale, "studentInitialPasswordNotice", { password: "123456" })}</p>
          <form action={importStudentsAction.bind(null, "/admin/students?import=1", "/admin/students")} className="mt-5 grid gap-4">
            <input id={inputId} name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" required onChange={(event) => setFilename(event.target.files?.[0]?.name ?? "")} />
            <label htmlFor={inputId} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm hover:border-indigo-300 hover:bg-indigo-50/40">
              <span className="truncate text-slate-600">{filename || t(locale, "noFileSelected")}</span>
              <span className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700">{t(locale, "chooseFile")}</span>
            </label>
            <p className="text-xs leading-5 text-slate-500">{t(locale, "studentImportFileLimit")}</p>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
              <Link href={closeHref} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t(locale, "cancel")}</Link>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{t(locale, "importStudents")}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
