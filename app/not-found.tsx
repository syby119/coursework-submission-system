import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const locale = await getLocale();
  return <main className="flex flex-1 flex-col items-center justify-center px-4 text-center"><h1 className="text-2xl font-bold text-slate-900">{t(locale, "pageNotFound")}</h1><Link className="mt-4 text-indigo-700 hover:text-indigo-900" href="/">{t(locale, "backHome")}</Link></main>;
}
