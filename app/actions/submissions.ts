"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth/guards";
import { isPastDeadline } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import {
  isSubmissionPathForUser,
  validateSubmissionFile,
} from "@/lib/validation/submission";

type ActionError = { success: false; error: string };
type Preparation = { success: true; path: string } | ActionError;
type Finalization = { success: true } | ActionError;

async function getLiveAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("id, deadline, published_at")
    .eq("id", assignmentId)
    .maybeSingle();
  return data;
}

export async function prepareSubmissionAction(
  assignmentId: string,
  filename: string,
  fileSize: number,
): Promise<Preparation> {
  const profile = await requireStudent();
  const validation = validateSubmissionFile(filename, fileSize);
  if (!validation.valid) return { success: false, error: validation.error };

  const assignment = await getLiveAssignment(assignmentId);
  if (!assignment) return { success: false, error: "该作业不存在或尚未发布。" };
  if (isPastDeadline(assignment.deadline)) return { success: false, error: "已超过截止时间，无法提交。" };

  return {
    success: true,
    path: `${assignment.id}/${profile.id}/${crypto.randomUUID()}.${validation.extension}`,
  };
}

export async function finalizeSubmissionAction(input: {
  assignmentId: string;
  path: string;
  filename: string;
  fileSize: number;
}): Promise<Finalization> {
  const profile = await requireStudent();
  const validation = validateSubmissionFile(input.filename, input.fileSize);
  if (!validation.valid) return { success: false, error: validation.error };
  if (!isSubmissionPathForUser(input.path, input.assignmentId, profile.id)) {
    return { success: false, error: "上传路径无效，请重新选择文件。" };
  }

  const assignment = await getLiveAssignment(input.assignmentId);
  if (!assignment || isPastDeadline(assignment.deadline)) {
    return { success: false, error: "已超过截止时间，无法提交。" };
  }

  const supabase = await createClient();
  const objectName = input.path.split("/")[2];
  const { data: objects, error: objectLookupError } = await supabase.storage
    .from("submissions")
    .list(`${input.assignmentId}/${profile.id}`, { limit: 10, search: objectName });
  const uploadedObject = objects?.find((object) => object.name === objectName);
  const storedFileSize = Number(uploadedObject?.metadata?.size);
  if (objectLookupError || !uploadedObject || !Number.isSafeInteger(storedFileSize) || storedFileSize !== input.fileSize) {
    return { success: false, error: "未找到完整的上传文件，请重新上传后再提交。" };
  }

  const { data: previous } = await supabase
    .from("submissions")
    .select("storage_path")
    .eq("assignment_id", input.assignmentId)
    .eq("student_id", profile.id)
    .maybeSingle();

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: input.assignmentId,
      student_id: profile.id,
      storage_path: input.path,
      original_filename: validation.safeFilename,
      file_size: input.fileSize,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,student_id" },
  );

  if (error) return { success: false, error: "提交记录保存失败，请稍后重试。" };

  if (previous?.storage_path && previous.storage_path !== input.path) {
    await supabase.storage.from("submissions").remove([previous.storage_path]);
  }

  revalidatePath("/");
  revalidatePath(`/assignments/${input.assignmentId}`);
  revalidatePath(`/admin/assignments/${input.assignmentId}`);
  return { success: true };
}

export async function getDownloadUrlAction(path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "请先登录。" };

  const { data: submission } = await supabase
    .from("submissions")
    .select("storage_path")
    .eq("storage_path", path)
    .maybeSingle();
  if (!submission) return { error: "没有权限下载此文件。" };

  const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return { error: "下载链接创建失败，请稍后重试。" };
  return { url: data.signedUrl };
}
