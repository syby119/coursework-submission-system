import { formatDateTime } from "@/lib/time";
import type { Assignment } from "@/types/database";

export function AssignmentOverview({ assignment }: { assignment: Assignment }) {
  return (
    <section className="py-7 sm:py-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900">作业信息</h2>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <dl className="mt-5 grid overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm sm:grid-cols-2">
        <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-xs font-medium tracking-wide text-slate-500">发布时间</dt>
          <dd className="mt-2 tabular-nums text-base font-medium text-slate-900">{formatDateTime(assignment.published_at)}</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs font-medium tracking-wide text-slate-500">截止时间</dt>
          <dd className="mt-2 tabular-nums text-base font-medium text-slate-900">{formatDateTime(assignment.deadline)}</dd>
        </div>
      </dl>
      <section className="mt-8">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">作业描述</h3>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          {assignment.description ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{assignment.description}</p>
          ) : (
            <p className="text-sm text-slate-500">未填写作业描述。</p>
          )}
        </div>
      </section>
    </section>
  );
}
