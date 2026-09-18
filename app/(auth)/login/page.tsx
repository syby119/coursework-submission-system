import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getCurrentUser } from "@/lib/auth/current-user";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/");
  const locale = await getLocale();

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><LanguageSwitcher locale={locale} /></div>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t(locale, "loginTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t(locale, "loginIntroduction")}</p>
        <div className="mt-7"><LoginForm locale={locale} /></div>
      </section>
    </main>
  );
}
