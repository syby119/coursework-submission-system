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
import { t, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

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

function duplicateTitleMessage(locale: Locale, title: string, action: string) {
  return t(locale, "assignmentTitleDuplicate", { action, title });
}

function assignmentValues(formData: FormData, locale: Locale) {
  const title = textField(formData, "title", 200);
  const description = textField(formData, "description", 10000);
  const publishedAt = parseShanghaiDateTime(String(formData.get("published_at") ?? ""));
  const deadline = parseShanghaiDateTime(String(formData.get("deadline") ?? ""));

  if (!title) return { error: t(locale, "assignmentTitleRequired") };
  if (!publishedAt || !deadline) return { error: t(locale, "assignmentTimeRequired") };
  if (new Date(deadline) <= new Date(publishedAt)) {
    return { error: t(locale, "deadlineAfterPublished") };
  }

  return { values: { title, description, published_at: publishedAt, deadline } };
}

export async function createAssignmentAction(errorPath: string, successPath: string, formData: FormData) {
  const locale = await getLocale();
  const profile = await requireAdmin();
  const parsed = assignmentValues(formData, locale);
  if ("error" in parsed) redirectWithMessage(errorPath, "error", parsed.error ?? t(locale, "assignmentDetailsInvalid"));
  if (await findAssignmentByTitle(parsed.values.title)) {
    redirectWithMessage(errorPath, "error", duplicateTitleMessage(locale, parsed.values.title, t(locale, "create")));
  }

  try {
    await createAssignment(parsed.values, profile.id);
  } catch (error) {
    console.error("Assignment creation failed", error);
    if (isDuplicateTitleError(error)) {
      redirectWithMessage(errorPath, "error", duplicateTitleMessage(locale, parsed.values.title, t(locale, "create")));
    }
    redirectWithMessage(errorPath, "error", t(locale, "assignmentCreateFailed"));
  }
  revalidatePath("/");
  revalidatePath("/admin");
  redirectWithMessage(successPath, "success", t(locale, "assignmentCreated"));
}

export async function updateAssignmentAction(
  assignmentId: string,
  errorPath: string,
  successPath: string,
  formData: FormData,
) {
  const locale = await getLocale();
  await requireAdmin();
  const parsed = assignmentValues(formData, locale);
  if ("error" in parsed) redirectWithMessage(errorPath, "error", parsed.error ?? t(locale, "assignmentDetailsInvalid"));

  let assignment;
  try {
    assignment = await updateAssignment(assignmentId, parsed.values);
  } catch (error) {
    console.error("Assignment update failed", error);
    if (isDuplicateTitleError(error)) {
      redirectWithMessage(errorPath, "error", duplicateTitleMessage(locale, parsed.values.title, t(locale, "saveChanges")));
    }
    redirectWithMessage(errorPath, "error", t(locale, "assignmentUpdateFailed"));
  }
  if (!assignment) redirectWithMessage(errorPath, "error", t(locale, "assignmentMissing"));
  revalidatePath("/");
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/assignments/${assignmentId}`);
  redirectWithMessage(successPath, "success", t(locale, "assignmentUpdated"));
}

export async function deleteAssignmentAction(assignmentId: string) {
  const locale = await getLocale();
  await requireAdmin();
  let result;
  try {
    result = await deleteAssignment(assignmentId);
  } catch (error) {
    console.error("Assignment deletion failed", error);
    redirectWithMessage("/admin", "error", t(locale, "assignmentDeleteFailed"));
  }
  if (!result.deleted) redirectWithMessage("/admin", "error", t(locale, "assignmentMissing"));
  for (const storagePath of result.paths) {
    removeStoredFile(storagePath).catch((error: unknown) => {
      console.error("Could not remove deleted assignment file", error);
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirectWithMessage("/admin", "success", t(locale, "assignmentDeleted"));
}

export async function updateSubmissionScoreAction(assignmentId: string, submissionId: string, formData: FormData) {
  const locale = await getLocale();
  await requireAdmin();
  const pagePath = `/admin/assignments/${assignmentId}`;
  const basePath = `${pagePath}?tab=submissions`;
  const score = String(formData.get("score") ?? "").trim();
  if (!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(score)) {
    redirectWithMessage(basePath, "error", t(locale, "scoreInvalid"));
  }

  const submission = await updateSubmissionScore(assignmentId, submissionId, score);
  if (!submission) redirectWithMessage(basePath, "error", t(locale, "submissionMissing"));
  revalidatePath(pagePath);
  redirectWithMessage(basePath, "success", t(locale, "scoreSaved"));
}
