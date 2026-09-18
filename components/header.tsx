import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import type { AuthenticatedUser } from "@/lib/auth/guards";

export function Header({ profile }: { profile: AuthenticatedUser }) {
  const home = profile.role === "admin" ? "/admin" : "/";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={home} className="font-semibold tracking-tight text-slate-900">
          课程作业管理系统
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-600 sm:inline">{profile.name}</span>
          {profile.role === "admin" ? (
            <Link className="rounded-md px-2.5 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50" href="/admin">
              管理后台
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button className="rounded-md border border-slate-300 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
              退出
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
