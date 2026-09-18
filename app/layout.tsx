import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/i18n-server";
import { localeToHtmlLang, t } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: t(locale, "systemTitle"), description: t(locale, "systemDescription") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={localeToHtmlLang(locale)}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
