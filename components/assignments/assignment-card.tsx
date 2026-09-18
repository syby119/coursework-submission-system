import Link from "next/link";
import { formatDateTime, isPastDeadline } from "@/lib/time";
import type { Assignment, Submission } from "@/types/database";

export function AssignmentCard({ assignment, submission }: { assignment: Assignment; submission?: Submission }) {
  const overdue = isPastDeadline(assignment.deadline);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{assignment.title}</h2>
          <p className="mt-1 text-sm text-slate-600">截止：{formatDateTime(assignment.deadline)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${submission ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
          {submission ? "已提交" : overdue ? "已逾期" : "未提交"}
        </span>
      </div>
      {submission ? <p className="mt-3 text-sm text-slate-500">最后提交：{formatDateTime(submission.submitted_at)}</p> : null}
      <Link className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:text-indigo-900" href={`/assignments/${assignment.id}`}>
        查看作业 →
      </Link>
    </article>
  );
}
