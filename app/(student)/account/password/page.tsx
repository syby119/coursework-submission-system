import Link from "next/link";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function ChangePasswordPage() {
  const locale = await getLocale();
  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 sm:py-10">
      <Link className="text-sm font-medium text-indigo-700 hover:text-indigo-800" href="/">
        {t(locale, "backMyAssignments")}
      </Link>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{t(locale, "passwordTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t(locale, "passwordIntroduction")}</p>
        <div className="mt-6">
          <ChangePasswordForm locale={locale} />
        </div>
      </div>
    </main>
  );
}
