import { DownloadButton } from "@/components/submissions/download-button";
import { formatDateTime } from "@/lib/time";
import type { Submission, User } from "@/types/database";

export function AdminSubmissionTable({ students, submissions }: { students: User[]; submissions: Submission[] }) {
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const submission = byStudent.get(student.id);
            return (
              <tr key={student.id}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{student.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{student.student_number || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${submission ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{submission ? "已提交" : "未提交"}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{submission ? formatDateTime(submission.submitted_at) : "—"}</td>
                <td className="min-w-44 px-4 py-3 text-slate-600">{submission ? <><p className="mb-1 truncate" title={submission.original_filename}>{submission.original_filename}</p><DownloadButton submissionId={submission.id} /></> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
