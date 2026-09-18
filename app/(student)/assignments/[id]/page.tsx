import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/submissions/download-button";
import { UploadForm } from "@/components/submissions/upload-form";
import { requireStudent } from "@/lib/auth/guards";
import { formatDateTime, isPastDeadline } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle();
  if (!assignment) notFound();
  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", id)
    .eq("student_id", profile.id)
    .maybeSingle();
  const overdue = isPastDeadline(assignment.deadline);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">← 返回我的作业</Link>
      <article className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm text-slate-500">发布时间：{formatDateTime(assignment.published_at)}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{assignment.title}</h1>
        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{assignment.description || "暂无作业说明。"}</p>
        <div className={`mt-6 rounded-lg border p-4 ${overdue ? "border-red-200 bg-red-50" : "border-indigo-100 bg-indigo-50"}`}>
          <p className="font-medium text-slate-900">截止时间：{formatDateTime(assignment.deadline)}</p>
          <p className={`mt-1 text-sm ${overdue ? "text-red-700" : "text-slate-600"}`}>{overdue ? "该作业已逾期，系统已关闭提交。" : "截止前可重复提交，最新一次将作为当前提交。"}</p>
        </div>
      </article>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">我的提交</h2>
        {submission ? (
          <div className="mt-3 rounded-lg bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-800">已提交：{submission.original_filename}</p>
            <p className="mt-1 text-emerald-700">最后提交：{formatDateTime(submission.submitted_at)}</p>
            <div className="mt-2"><DownloadButton path={submission.storage_path} /></div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-600">尚未提交。</p>}
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="font-medium text-slate-900">{submission ? "重新提交" : "上传作业"}</h3>
          <div className="mt-3"><UploadForm assignmentId={assignment.id} disabled={overdue} /></div>
        </div>
      </section>
    </main>
  );
}
