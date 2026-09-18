import Link from "next/link";
import { AdminAssignmentList } from "@/components/admin/admin-assignment-list";
import { AssignmentDialog } from "@/components/admin/assignment-dialog";
import { DeleteAssignmentDialog } from "@/components/admin/delete-assignment-dialog";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllAssignments } from "@/lib/db/assignments";

type AdminPageProps = { searchParams: Promise<{ create?: string; delete?: string; error?: string; success?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const messages = await searchParams;
  const assignments = await listAllAssignments();
  const createOpen = messages.create === "1";
  const assignmentToDelete = createOpen ? undefined : assignments.find((assignment) => assignment.id === messages.delete);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-medium text-indigo-700">管理员后台</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">作业管理</h1>
          <p className="mt-2 text-sm text-slate-600">创建、查看和维护当前课程作业。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/admin/export" className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
            导出全部
          </a>
          <Link href="/admin?create=1" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            ＋ 新建作业
          </Link>
        </div>
      </div>
      {messages.error && !createOpen ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{messages.error}</p> : null}
      {messages.success ? <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">全部作业</h2>
          <p className="text-sm text-slate-500">共 {assignments.length} 个作业 · 时间均为北京时间（UTC+8）</p>
        </div>
        <div className="mt-4"><AdminAssignmentList assignments={assignments} /></div>
      </section>
      {createOpen ? (
        <AssignmentDialog
          title="新建作业"
          closeHref="/admin"
          error={messages.error}
          errorPath="/admin?create=1"
          successPath="/admin"
        />
      ) : null}
      {assignmentToDelete ? <DeleteAssignmentDialog assignment={assignmentToDelete} closeHref="/admin" /> : null}
    </main>
  );
}
