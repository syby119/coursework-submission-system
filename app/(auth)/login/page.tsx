import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-sm font-medium text-indigo-700">Coursework</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">登录课程作业系统</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">请使用课程管理员提供的学号和密码登录。</p>
        <div className="mt-7"><LoginForm /></div>
      </section>
    </main>
  );
}
