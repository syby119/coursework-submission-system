import { DownloadButton } from "@/components/submissions/download-button";
import { updateSubmissionScoreAction } from "@/app/actions/assignments";
import { formatDateTime, isLateSubmission } from "@/lib/time";
import type { Submission, User } from "@/types/database";

export function AdminSubmissionTable({ students, submissions, deadline }: { students: User[]; submissions: Submission[]; deadline: string }) {
  const byStudent = new Map(submissions.map((submission) => [submission.student_id, submission]));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">学生</th>
            <th className="px-4 py-3 font-medium">学号</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">提交时间</th>
            <th className="px-4 py-3 font-medium">文件</th>
            <th className="px-4 py-3 font-medium">分数</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const submission = byStudent.get(student.id);
            const late = submission ? isLateSubmission(submission.submitted_at, deadline) : false;
            return (
              <tr key={student.id}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{student.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{student.student_number || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${late ? "bg-amber-50 text-amber-700" : submission ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{late ? "补交" : submission ? "已提交" : "未提交"}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{submission ? formatDateTime(submission.submitted_at) : "—"}</td>
                <td className="min-w-44 px-4 py-3 text-slate-600">{submission ? <><p className="mb-1 truncate" title={submission.original_filename}>{submission.original_filename}</p><DownloadButton submissionId={submission.id} /></> : "—"}</td>
                <td className="min-w-40 px-4 py-3">
                  {submission ? (
                    <form action={updateSubmissionScoreAction.bind(null, submission.assignment_id, submission.id)} className="flex items-center gap-2">
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
                        className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-indigo-600 focus:ring-2"
                      />
                      <button className="rounded-md border border-indigo-200 px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">保存</button>
                    </form>
                  ) : <span className="text-slate-500">0</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
