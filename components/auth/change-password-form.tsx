"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/app/actions/auth";
import { t, type Locale } from "@/lib/i18n";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">
        {t(locale, "currentPassword")}
        <input
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 transition focus:ring-2"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {t(locale, "newPassword")}
        <input
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 transition focus:ring-2"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {t(locale, "confirmNewPassword")}
        <input
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-600 transition focus:ring-2"
          name="new_password_confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </label>
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p> : null}
      <button
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        {pending ? t(locale, "changingPassword") : t(locale, "updatePassword")}
      </button>
    </form>
  );
}
