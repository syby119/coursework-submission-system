import Link from "next/link";
import { AssignmentForm } from "@/components/admin/assignment-form";
import { deleteAssignmentAction } from "@/app/actions/assignments";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";

type AdminPageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("assignments").select("*").order("deadline", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-7">
        <p className="text-sm font-medium text-indigo-700">管理员后台</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">作业管理</h1>
      </div>
      {messages.error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{messages.error}</p> : null}
      {messages.success ? <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">新建作业</h2>
        <div className="mt-5"><AssignmentForm /></div>
      </section>
      <section className="mt-7">
        <h2 className="text-lg font-semibold text-slate-900">全部作业</h2>
        <div className="mt-4 grid gap-3">
          {(assignments ?? []).map((assignment) => (
            <article className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center" key={assignment.id}>
              <div>
                <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                <p className="mt-1 text-sm text-slate-600">截止：{formatDateTime(assignment.deadline)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link className="text-sm font-medium text-indigo-700 hover:text-indigo-900" href={`/admin/assignments/${assignment.id}`}>编辑与提交情况</Link>
                <form action={deleteAssignmentAction.bind(null, assignment.id)}>
                  <button className="text-sm font-medium text-red-700 hover:text-red-900">删除</button>
                </form>
              </div>
            </article>
          ))}
          {!assignments?.length ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">尚未创建作业。</p> : null}
        </div>
      </section>
    </main>
  );
}
