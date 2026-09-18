import { AdminSubmissionTable } from "@/components/admin/submission-table";
import type { Assignment, Submission, User } from "@/types/database";

export function AssignmentSubmissionManagement({
  assignment,
  students,
  submissions,
}: {
  assignment: Assignment;
  students: User[];
  submissions: Submission[];
}) {
  const total = students.length;
  const submitted = submissions.length;

  return (
    <section className="py-7 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">提交情况</h2>
          <p className="mt-1 text-sm text-slate-600">以全部学生账号为名单基准。</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <a
            href={`/api/admin/assignments/${assignment.id}/export`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            导出全部作业（ZIP）
          </a>
          <a
            href={`/api/admin/assignments/${assignment.id}/grades`}
            className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            导出成绩（Excel）
          </a>
          <p className="text-sm font-medium text-slate-700">已提交：{submitted}　未提交：{total - submitted}　总人数：{total}</p>
        </div>
      </div>
      <div className="mt-5"><AdminSubmissionTable students={students} submissions={submissions} deadline={assignment.deadline} /></div>
    </section>
  );
}
