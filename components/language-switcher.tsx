"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale, t } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    router.refresh();
  }

  return (
    <div className="flex items-center rounded-md border border-slate-300 p-0.5 text-xs font-medium" aria-label={t(locale, "switchLanguage")}>
      <button type="button" onClick={() => changeLocale("zh-CN")} aria-pressed={locale === "zh-CN"} className={`rounded px-2 py-1 ${locale === "zh-CN" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>
        {t(locale, "chinese")}
      </button>
      <button type="button" onClick={() => changeLocale("en")} aria-pressed={locale === "en"} className={`rounded px-2 py-1 ${locale === "en" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>
        {t(locale, "english")}
      </button>
    </div>
  );
}
