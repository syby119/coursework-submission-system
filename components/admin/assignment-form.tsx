import { createAssignmentAction, updateAssignmentAction } from "@/app/actions/assignments";
import { formatDateTimeLocal } from "@/lib/time";
import type { Assignment } from "@/types/database";

export function AssignmentForm({ assignment }: { assignment?: Assignment }) {
  const action = assignment ? updateAssignmentAction.bind(null, assignment.id) : createAssignmentAction;
  const defaultPublished = assignment ? formatDateTimeLocal(assignment.published_at) : formatDateTimeLocal(new Date().toISOString());
  const defaultDeadline = assignment ? formatDateTimeLocal(assignment.deadline) : "";

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        作业标题
        <input name="title" defaultValue={assignment?.title} required maxLength={200} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 focus:ring-2" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        作业描述
        <textarea name="description" defaultValue={assignment?.description} maxLength={10000} rows={7} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 focus:ring-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          发布时间（北京时间）
          <input name="published_at" type="datetime-local" defaultValue={defaultPublished} required className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 focus:ring-2" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          截止时间（北京时间）
          <input name="deadline" type="datetime-local" defaultValue={defaultDeadline} required className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 focus:ring-2" />
        </label>
      </div>
      <button className="w-fit rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
        {assignment ? "保存修改" : "创建作业"}
      </button>
    </form>
  );
}
