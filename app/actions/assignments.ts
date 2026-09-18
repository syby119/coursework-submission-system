"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { parseShanghaiDateTime } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";

function textField(formData: FormData, field: string, maxLength: number) {
  const value = String(formData.get(field) ?? "").trim();
  return value.length <= maxLength ? value : "";
}

function assignmentValues(formData: FormData) {
  const title = textField(formData, "title", 200);
  const description = textField(formData, "description", 10000);
  const publishedAt = parseShanghaiDateTime(String(formData.get("published_at") ?? ""));
  const deadline = parseShanghaiDateTime(String(formData.get("deadline") ?? ""));

  if (!title) return { error: "请填写不超过 200 个字符的作业标题。" };
  if (!publishedAt || !deadline) return { error: "请填写有效的发布时间和截止时间。" };
  if (new Date(deadline) <= new Date(publishedAt)) {
    return { error: "截止时间必须晚于发布时间。" };
  }

  return { values: { title, description, published_at: publishedAt, deadline } };
}

export async function createAssignmentAction(formData: FormData) {
  const profile = await requireAdmin();
  const parsed = assignmentValues(formData);
  if ("error" in parsed) redirect(`/admin?error=${encodeURIComponent(parsed.error ?? "作业信息无效。")}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .insert({ ...parsed.values, created_by: profile.id });

  if (error) redirect("/admin?error=作业创建失败，请稍后重试。");
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=作业已创建。");
}

export async function updateAssignmentAction(assignmentId: string, formData: FormData) {
  await requireAdmin();
  const parsed = assignmentValues(formData);
  const basePath = `/admin/assignments/${assignmentId}`;
  if ("error" in parsed) redirect(`${basePath}?error=${encodeURIComponent(parsed.error ?? "作业信息无效。")}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update(parsed.values)
    .eq("id", assignmentId);

  if (error) redirect(`${basePath}?error=作业更新失败，请稍后重试。`);
  revalidatePath("/");
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/admin");
  revalidatePath(basePath);
  redirect(`${basePath}?success=作业已更新。`);
}

export async function deleteAssignmentAction(assignmentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select("storage_path")
    .eq("assignment_id", assignmentId);
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) redirect("/admin?error=作业删除失败，请稍后重试。");

  if (submissions?.length) {
    await supabase.storage.from("submissions").remove(submissions.map((submission) => submission.storage_path));
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=作业已删除。");
}
