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
import { updateSubmissionScore } from "@/lib/db/submissions";
import { parseShanghaiDateTime } from "@/lib/time";
import { removeStoredFile } from "@/lib/storage/local";

function textField(formData: FormData, field: string, maxLength: number) {
  const value = String(formData.get(field) ?? "").trim();
  return value.length <= maxLength ? value : "";
}

function redirectWithMessage(path: string, key: "error" | "success", message: string): never {
  const [pathname, search = ""] = path.split("?", 2);
  const searchParams = new URLSearchParams(search);
  searchParams.set(key, message);
  redirect(`${pathname}?${searchParams.toString()}`);
}

function isDuplicateTitleError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "23505"
    && "constraint" in error
    && error.constraint === "assignments_title_unique";
}

function duplicateTitleMessage(title: string, action: "创建" | "保存") {
  return `${action}失败：作业标题“${title}”已存在。请修改标题后重试。`;
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
    redirectWithMessage("/admin", "error", duplicateTitleMessage(parsed.values.title, "创建"));
  }

  try {
    await createAssignment(parsed.values, profile.id);
  } catch (error) {
    console.error("Assignment creation failed", error);
    if (isDuplicateTitleError(error)) {
      redirectWithMessage("/admin", "error", duplicateTitleMessage(parsed.values.title, "创建"));
    }
    redirectWithMessage("/admin", "error", "作业创建失败，请稍后重试。");
  }
  revalidatePath("/");
  revalidatePath("/admin");
  redirectWithMessage("/admin", "success", "作业已创建。");
}

export async function updateAssignmentAction(
  assignmentId: string,
  errorPath: string,
  successPath: string,
  formData: FormData,
) {
  await requireAdmin();
  const parsed = assignmentValues(formData);
  if ("error" in parsed) redirectWithMessage(errorPath, "error", parsed.error ?? "作业信息无效。");

  let assignment;
  try {
    assignment = await updateAssignment(assignmentId, parsed.values);
  } catch (error) {
    console.error("Assignment update failed", error);
    if (isDuplicateTitleError(error)) {
      redirectWithMessage(errorPath, "error", duplicateTitleMessage(parsed.values.title, "保存"));
    }
    redirectWithMessage(errorPath, "error", "作业更新失败，请稍后重试。");
  }
  if (!assignment) redirectWithMessage(errorPath, "error", "作业不存在。");
  revalidatePath("/");
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/assignments/${assignmentId}`);
  redirectWithMessage(successPath, "success", "作业已更新。");
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

export async function updateSubmissionScoreAction(assignmentId: string, submissionId: string, formData: FormData) {
  await requireAdmin();
  const pagePath = `/admin/assignments/${assignmentId}`;
  const basePath = `${pagePath}?tab=submissions`;
  const score = String(formData.get("score") ?? "").trim();
  if (!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(score)) {
    redirectWithMessage(basePath, "error", "分数必须是 0 到 999999.99 之间、最多保留两位小数的数字。 ");
  }

  const submission = await updateSubmissionScore(assignmentId, submissionId, score);
  if (!submission) redirectWithMessage(basePath, "error", "未找到对应的学生提交。 ");
  revalidatePath(pagePath);
  redirectWithMessage(basePath, "success", "分数已保存。");
}
