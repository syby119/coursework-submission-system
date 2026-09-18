import Link from "next/link";
import { AssignmentForm } from "@/components/admin/assignment-form";
import type { Assignment } from "@/types/database";

export function EditAssignmentDialog({ assignment, closeHref, error }: { assignment: Assignment; closeHref: string; error?: string }) {
  const errorPath = `${closeHref}&edit=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-assignment-title">
      <Link href={closeHref} className="absolute inset-0 bg-slate-950/40" aria-label="关闭编辑作业弹窗" />
      <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="edit-assignment-title" className="text-lg font-semibold text-slate-900">编辑作业</h2>
          <Link href={closeHref} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="关闭编辑作业弹窗">
            <span aria-hidden="true">×</span>
          </Link>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <AssignmentForm assignment={assignment} cancelHref={closeHref} errorPath={errorPath} successPath={closeHref} />
        </div>
      </section>
    </div>
  );
}
