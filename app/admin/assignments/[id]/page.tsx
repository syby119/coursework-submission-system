import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentForm } from "@/components/admin/assignment-form";
import { AdminSubmissionTable } from "@/components/admin/submission-table";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type AdminAssignmentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function AdminAssignmentPage({ params, searchParams }: AdminAssignmentPageProps) {
  const { id } = await params;
  const messages = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: assignment }, { data: students }, { data: submissions }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("*").eq("role", "student").order("student_number", { ascending: true }),
    supabase.from("submissions").select("*").eq("assignment_id", id),
  ]);
  if (!assignment) notFound();
  const total = students?.length ?? 0;
  const submitted = submissions?.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">← 返回作业管理</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{assignment.title}</h1>
      {messages.error ? <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{messages.error}</p> : null}
      {messages.success ? <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">编辑作业</h2>
        <div className="mt-5"><AssignmentForm assignment={assignment} /></div>
      </section>
      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900">提交情况</h2><p className="mt-1 text-sm text-slate-600">以全部学生账号为名单基准。</p></div>
          <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">已提交：{submitted}　未提交：{total - submitted}　总人数：{total}</div>
        </div>
        <div className="mt-4"><AdminSubmissionTable students={students ?? []} submissions={submissions ?? []} /></div>
      </section>
    </main>
  );
}
