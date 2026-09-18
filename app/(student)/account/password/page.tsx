import Link from "next/link";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function ChangePasswordPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 sm:py-10">
      <Link className="text-sm font-medium text-indigo-700 hover:text-indigo-800" href="/">
        ← 返回我的作业
      </Link>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">修改密码</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">修改后，其他设备上的登录会自动失效。</p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
