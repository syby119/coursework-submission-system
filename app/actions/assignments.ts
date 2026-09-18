"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import {
  createAssignment,
  deleteAssignment,
  findAssignmentByTitle,
  updateAssignment,
} from "@/lib/db/assignments";
import { parseShanghaiDateTime } from "@/lib/time";
import { removeStoredFile } from "@/lib/storage/local";

function textField(formData: FormData, field: string, maxLength: number) {
  const value = String(formData.get(field) ?? "").trim();
  return value.length <= maxLength ? value : "";
}

function redirectWithMessage(path: string, key: "error" | "success", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function isDuplicateTitleError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "23505"
    && "constraint" in error
    && error.constraint === "assignments_title_unique";
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
  if ("error" in parsed) redirectWithMessage("/admin", "error", parsed.error ?? "作业信息无效。");
  if (await findAssignmentByTitle(parsed.values.title)) {
    redirectWithMessage("/admin", "error", "该标题的作业已存在，创建失败。");
  }

  try {
    await createAssignment(parsed.values, profile.id);
  } catch (error) {
    console.error("Assignment creation failed", error);
    if (isDuplicateTitleError(error)) {
      redirectWithMessage("/admin", "error", "该标题的作业已存在，创建失败。");
    }
    redirectWithMessage("/admin", "error", "作业创建失败，请稍后重试。");
  }
  revalidatePath("/");
  revalidatePath("/admin");
  redirectWithMessage("/admin", "success", "作业已创建。");
}

export async function updateAssignmentAction(assignmentId: string, formData: FormData) {
  await requireAdmin();
  const parsed = assignmentValues(formData);
  const basePath = `/admin/assignments/${assignmentId}`;
  if ("error" in parsed) redirectWithMessage(basePath, "error", parsed.error ?? "作业信息无效。");

  let assignment;
  try {
    assignment = await updateAssignment(assignmentId, parsed.values);
  } catch (error) {
    console.error("Assignment update failed", error);
    redirectWithMessage(basePath, "error", "作业更新失败，请稍后重试。");
  }
  if (!assignment) redirectWithMessage(basePath, "error", "作业不存在。");
  revalidatePath("/");
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/admin");
  revalidatePath(basePath);
  redirectWithMessage(basePath, "success", "作业已更新。");
}

export async function deleteAssignmentAction(assignmentId: string) {
  await requireAdmin();
  let result;
  try {
    result = await deleteAssignment(assignmentId);
  } catch (error) {
    console.error("Assignment deletion failed", error);
    redirectWithMessage("/admin", "error", "作业删除失败，请稍后重试。");
  }
  if (!result.deleted) redirectWithMessage("/admin", "error", "作业不存在。");
  for (const storagePath of result.paths) {
    removeStoredFile(storagePath).catch((error: unknown) => {
      console.error("Could not remove deleted assignment file", error);
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirectWithMessage("/admin", "success", "作业已删除。");
}
