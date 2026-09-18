import { cookies } from "next/headers";
import { LOCALE_COOKIE, localeFromValue } from "@/lib/i18n";

export async function getLocale() {
  const cookieStore = await cookies();
  return localeFromValue(cookieStore.get(LOCALE_COOKIE)?.value);
}
