"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export function AdminNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: t(locale, "assignmentManagement"), active: pathname === "/admin" || pathname.startsWith("/admin/assignments/") },
    { href: "/admin/students", label: t(locale, "studentManagement"), active: pathname === "/admin/students" },
  ];

  return (
    <nav className="flex items-center gap-1" aria-label={t(locale, "adminManagement")}>
      {links.map((link) => (
        <Link
          aria-current={link.active ? "page" : undefined}
          className={`border-b-2 px-2.5 py-1.5 font-medium transition-colors ${link.active ? "border-indigo-600 text-indigo-800" : "border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-700"}`}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
