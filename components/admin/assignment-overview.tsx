import { formatDateTime } from "@/lib/time";
import type { Assignment } from "@/types/database";

export function AssignmentOverview({ assignment }: { assignment: Assignment }) {
  return (
    <section className="py-7 sm:py-8">
      <h2 className="text-lg font-semibold text-slate-900">作业详情</h2>
      <dl className="mt-5 border-y border-slate-200 py-4 text-sm sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6">
        <dt className="font-medium text-slate-500">作业标题</dt>
        <dd className="mt-1 leading-6 text-slate-900 sm:mt-0">{assignment.title}</dd>
        <dt className="font-medium text-slate-500 sm:pt-3">活动时间</dt>
        <dd className="mt-1 leading-6 text-slate-900 sm:mt-0 sm:pt-3">
          {formatDateTime(assignment.published_at)} 至 {formatDateTime(assignment.deadline)}
        </dd>
      </dl>
      <section className="mt-7">
        <h3 className="text-sm font-semibold text-slate-900">作业描述</h3>
        <div className="mt-3 border-t border-slate-200 pt-4">
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
