import { Header } from "@/components/header";
import { requireAdmin } from "@/lib/auth/guards";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();
  return <><Header profile={profile} />{children}</>;
}
