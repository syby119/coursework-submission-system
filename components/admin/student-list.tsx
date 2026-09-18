import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import { t, type Locale } from "@/lib/i18n";
import type { User } from "@/types/database";

export function StudentList({ students, locale }: { students: User[]; locale: Locale }) {
  if (!students.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center shadow-sm">
        <p className="font-medium text-slate-700">{t(locale, "noStudentsYet")}</p>
        <p className="mt-1 text-sm text-slate-500">{t(locale, "noStudentsIntroduction")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
        <table className="w-full table-fixed text-center text-sm">
          <thead className="border-b border-slate-200 bg-slate-100/80 text-sm font-semibold text-slate-700">
            <tr>
              <th className="w-[30%] px-5 py-3">{t(locale, "student")}</th>
              <th className="w-[30%] px-5 py-3">{t(locale, "studentNumber")}</th>
              <th className="w-[25%] px-5 py-3">{t(locale, "studentAddedAt")}</th>
              <th className="w-[15%] px-5 py-3">{t(locale, "actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr className="transition-colors hover:bg-slate-50/70" key={student.id}>
                <td className="truncate px-5 py-3.5 font-medium text-slate-800" title={student.name}>{student.name}</td>
                <td className="px-5 py-3.5 font-mono tabular-nums text-slate-600">{student.student_number}</td>
                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-600">{formatDateTime(student.created_at, locale)}</td>
                <td className="px-5 py-3.5">
                  <Link className="rounded-md px-2.5 py-1.5 font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-900" href={`/admin/students?delete=${student.id}`}>
                    {t(locale, "delete")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:hidden">
        {students.map((student) => (
          <article className="border-b border-slate-100 px-4 py-4 last:border-b-0" key={student.id}>
            <p className="truncate font-medium text-slate-800" title={student.name}>{student.name}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-slate-600">{student.student_number}</p>
            <p className="mt-2 text-sm text-slate-600"><span className="font-medium text-slate-500">{t(locale, "studentAddedAt")}：</span>{formatDateTime(student.created_at, locale)}</p>
            <div className="mt-3 text-sm font-medium">
              <Link className="rounded-md px-2.5 py-1.5 text-red-700 hover:bg-red-50 hover:text-red-900" href={`/admin/students?delete=${student.id}`}>{t(locale, "delete")}</Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
