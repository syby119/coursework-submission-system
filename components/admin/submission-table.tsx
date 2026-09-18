import { DownloadButton } from "@/components/submissions/download-button";
import { updateSubmissionScoreAction } from "@/app/actions/assignments";
import { formatDateTime, isLateSubmission } from "@/lib/time";
import type { Submission, User } from "@/types/database";

export function AdminSubmissionTable({ students, submissions, deadline }: { students: User[]; submissions: Submission[]; deadline: string }) {
  const byStudent = new Map(submissions.map((submission) => [submission.student_id, submission]));
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[960px] w-full table-fixed divide-y divide-slate-200 text-left text-sm">
        <colgroup>
          <col className="w-36" />
          <col className="w-40" />
          <col className="w-[6.5rem]" />
          <col className="w-[11.5rem]" />
          <col />
          <col className="w-48" />
        </colgroup>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center font-medium">学生</th>
            <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center font-medium">学号</th>
            <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center font-medium">状态</th>
            <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center font-medium">提交时间</th>
            <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center font-medium">文件</th>
            <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center font-medium">分数</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const submission = byStudent.get(student.id);
            const late = submission ? isLateSubmission(submission.submitted_at, deadline) : false;
            return (
              <tr key={student.id}>
                <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-900">{student.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-slate-600">{student.student_number || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-medium ${late ? "bg-amber-50 text-amber-700" : submission ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{late ? "补交" : submission ? "已提交" : "未提交"}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-slate-600">{submission ? formatDateTime(submission.submitted_at) : "—"}</td>
                <td className="min-w-0 px-4 py-3 text-center text-slate-600">{submission ? <><p className="mb-1 truncate" title={submission.original_filename}>{submission.original_filename}</p><DownloadButton submissionId={submission.id} /></> : "—"}</td>
                <td className="px-4 py-3 text-center">
                  {submission ? (
                    <form action={updateSubmissionScoreAction.bind(null, submission.assignment_id, submission.id)} className="flex items-center justify-center gap-2">
                      <input
                        name="score"
                        type="number"
                        min="0"
                        max="999999.99"
                        step="0.01"
                        defaultValue={submission.score ?? ""}
                        placeholder="未评分"
                        required
                        aria-label={`${student.name} 的分数`}
                        className="w-[5.5rem] rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm tabular-nums outline-none ring-indigo-600 focus:ring-2"
                      />
                      <button className="rounded-md border border-indigo-200 px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">保存</button>
                    </form>
                  ) : <span className="tabular-nums text-slate-500">0</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
