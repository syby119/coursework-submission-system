"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">
        学号
        <input
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 transition focus:ring-2"
          name="student_number"
          type="text"
          autoComplete="username"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        密码
        <input
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 transition focus:ring-2"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending}>
        {pending ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
