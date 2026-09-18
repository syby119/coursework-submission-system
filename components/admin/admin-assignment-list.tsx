import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import { t, type Locale } from "@/lib/i18n";
import type { Assignment } from "@/types/database";

export function AdminAssignmentList({ assignments, locale }: { assignments: Assignment[]; locale: Locale }) {
  if (!assignments.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center shadow-sm">
        <p className="font-medium text-slate-700">{t(locale, "noAssignmentsYet")}</p>
        <p className="mt-1 text-sm text-slate-500">{t(locale, "noAssignmentsIntroduction")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
        <table className="w-full table-fixed text-center text-sm">
          <thead className="border-b border-slate-200 bg-slate-100/80 text-sm font-semibold text-slate-700">
            <tr>
              <th className="w-[34%] px-5 py-3 text-center">{t(locale, "assignmentName")}</th>
              <th className="w-[25%] px-5 py-3 text-center">{t(locale, "publishedLabel")}</th>
              <th className="w-[25%] px-5 py-3 text-center">{t(locale, "dueTime")}</th>
              <th className="w-[16%] px-5 py-3 text-center">{t(locale, "actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignments.map((assignment) => {
              const detailHref = `/admin/assignments/${assignment.id}`;
              return (
                <tr className="transition-colors hover:bg-slate-50/70" key={assignment.id}>
                  <td className="px-5 py-3.5">
                    <Link href={detailHref} className="block truncate font-medium text-slate-800 transition-colors hover:text-indigo-700" title={assignment.title}>
                      {assignment.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDateTime(assignment.published_at, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDateTime(assignment.deadline, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-center">
                    <Link className="rounded-md px-2.5 py-1.5 font-medium text-indigo-700 transition-colors hover:bg-indigo-50 hover:text-indigo-900" href={detailHref}>{t(locale, "view")}</Link>
                    <Link className="ml-1 rounded-md px-2.5 py-1.5 font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-900" href={`/admin?delete=${assignment.id}`}>{t(locale, "delete")}</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:hidden">
        {assignments.map((assignment) => {
          const detailHref = `/admin/assignments/${assignment.id}`;
          return (
            <article className="border-b border-slate-100 px-4 py-4 last:border-b-0" key={assignment.id}>
              <Link href={detailHref} className="block truncate font-medium text-slate-800 hover:text-indigo-700" title={assignment.title}>
                {assignment.title}
              </Link>
              <p className="mt-2 text-sm text-slate-600"><span className="font-medium text-slate-500">{t(locale, "publishedLabel")}：</span>{formatDateTime(assignment.published_at, locale)}</p>
              <p className="mt-1 text-sm text-slate-600"><span className="font-medium text-slate-500">{t(locale, "deadline")}：</span>{formatDateTime(assignment.deadline, locale)}</p>
              <div className="mt-3 flex items-center gap-3 text-sm font-medium">
                <Link className="rounded-md px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900" href={detailHref}>{t(locale, "view")}</Link>
                <Link className="rounded-md px-2.5 py-1.5 text-red-700 hover:bg-red-50 hover:text-red-900" href={`/admin?delete=${assignment.id}`}>{t(locale, "delete")}</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
