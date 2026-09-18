import { Header } from "@/components/header";
import { requireStudent } from "@/lib/auth/guards";
import type { ReactNode } from "react";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireStudent();
  return <><Header profile={profile} />{children}</>;
}
