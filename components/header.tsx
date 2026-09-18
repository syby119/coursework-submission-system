import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import type { AuthenticatedUser } from "@/lib/auth/guards";
import { LanguageSwitcher } from "@/components/language-switcher";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export async function Header({ profile }: { profile: AuthenticatedUser }) {
  const locale = await getLocale();
  const home = profile.role === "admin" ? "/admin" : "/";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href={home} className="max-w-32 truncate font-semibold tracking-tight text-slate-900 sm:max-w-none">
          {t(locale, "systemTitle")}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 text-xs sm:gap-3 sm:text-sm">
          <LanguageSwitcher locale={locale} />
          <span className="hidden text-slate-600 sm:inline">{profile.name}</span>
          {profile.role === "student" ? (
            <Link className="rounded-md px-2.5 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50" href="/account/password">
              {t(locale, "changePassword")}
            </Link>
          ) : null}
          {profile.role === "admin" ? (
            <Link className="rounded-md px-2.5 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50" href="/admin">
              {t(locale, "adminManagement")}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button className="rounded-md border border-slate-300 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
              {t(locale, "signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
