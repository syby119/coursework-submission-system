import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import Busboy from "busboy";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ZipArchiveError, validateSubmittedZip } from "@/lib/archive/zip";
import { findPublishedAssignment } from "@/lib/db/assignments";
import { replaceSubmission } from "@/lib/db/submissions";
import { hasTrustedOrigin } from "@/lib/http/csrf";
import {
  createSubmissionStoragePath,
  createTemporaryPath,
  ensureUploadDirectories,
  moveTemporaryFile,
  removeStoredFile,
  removeTemporaryFile,
} from "@/lib/storage/local";
import { getConfig } from "@/lib/config";
import {
  hasAllowedMimeType,
  isUuid,
  validateSubmissionFile,
} from "@/lib/validation/submission";
import { isPastDeadline } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class UploadError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

type UploadedFile = { filename: string; mimeType: string; size: number };

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function streamSingleFile(request: NextRequest, tempPath: string): Promise<UploadedFile> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) {
    throw new UploadError(415, "请求必须使用 multipart/form-data。 ");
  }
  const requestBody = request.body;
  if (!requestBody) throw new UploadError(400, "上传内容为空。 ");

  return new Promise((resolve, reject) => {
    let fileSeen = false;
    let busboyFinished = false;
    let writerFinished = false;
    let settled = false;
    let filename = "";
    let mimeType = "";
    let size = 0;
    let writer: ReturnType<typeof createWriteStream> | undefined;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      writer?.destroy();
      reject(error);
    };
    const finishIfComplete = () => {
      if (!settled && fileSeen && busboyFinished && writerFinished) {
        settled = true;
        resolve({ filename, mimeType, size });
      }
    };

    let parser: Busboy.Busboy;
    try {
      parser = Busboy({
        headers: { "content-type": contentType },
        limits: { files: 1, fields: 0, fileSize: getConfig().maxUploadSize },
      });
    } catch {
      throw new UploadError(400, "上传请求格式无效。 ");
    }

    parser.on("file", (fieldname, file, info) => {
      if (fileSeen || fieldname !== "file") {
        file.resume();
        fail(new UploadError(400, "只能上传一个作业文件。 "));
        return;
      }
      fileSeen = true;
      filename = info.filename;
      mimeType = info.mimeType;
      writer = createWriteStream(tempPath, { flags: "wx", mode: 0o640 });
      writer.on("error", () => fail(new UploadError(500, "服务器暂时无法保存文件。 ")));
      writer.on("finish", () => {
        writerFinished = true;
        finishIfComplete();
      });
      file.on("data", (chunk: Buffer) => {
        size += chunk.length;
      });
      file.on("limit", () => fail(new UploadError(413, "文件不能超过 50 MB。 ")));
      file.on("error", () => fail(new UploadError(400, "文件上传中断。 ")));
      file.pipe(writer);
    });
    parser.on("field", () => fail(new UploadError(400, "上传请求包含不支持的字段。 ")));
    parser.on("filesLimit", () => fail(new UploadError(400, "只能上传一个作业文件。 ")));
    parser.on("error", () => fail(new UploadError(400, "上传请求格式无效。 ")));
    parser.on("finish", () => {
      busboyFinished = true;
      if (!fileSeen) fail(new UploadError(400, "请选择要提交的文件。 "));
      finishIfComplete();
    });

    Readable.fromWeb(requestBody as unknown as NodeReadableStream).on("error", () => fail(new UploadError(400, "文件上传中断。 "))).pipe(parser);
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = await context.params;
  if (!isUuid(assignmentId)) return jsonError(404, "作业不存在。 ");
  if (!hasTrustedOrigin(request)) return jsonError(403, "请求来源无效。 ");
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError(401, "请先以学生身份登录。 ");

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > getConfig().maxUploadSize + 1_048_576) {
    return jsonError(413, "文件不能超过 50 MB。 ");
  }
  const assignment = await findPublishedAssignment(assignmentId);
  if (!assignment) return jsonError(404, "作业不存在或尚未发布。 ");
  if (isPastDeadline(assignment.deadline)) return jsonError(403, "已超过截止时间，无法提交。 ");

  let tempPath: string | null = null;
  let storagePath: string | null = null;
  try {
    await ensureUploadDirectories();
    tempPath = createTemporaryPath();
    const uploaded = await streamSingleFile(request, tempPath);
    const validation = validateSubmissionFile(uploaded.filename, uploaded.size);
    if (!validation.valid) throw new UploadError(400, validation.error);
    if (!hasAllowedMimeType(validation.extension, uploaded.mimeType)) {
      throw new UploadError(400, "文件类型与扩展名不匹配。 ");
    }
    try {
      await validateSubmittedZip(tempPath);
    } catch (error) {
      if (error instanceof ZipArchiveError) throw new UploadError(400, error.message);
      throw error;
    }

    const currentAssignment = await findPublishedAssignment(assignmentId);
    if (!currentAssignment || isPastDeadline(currentAssignment.deadline)) {
      throw new UploadError(403, "已超过截止时间，无法提交。 ");
    }

    storagePath = createSubmissionStoragePath(assignmentId, user.id, validation.extension);
    await moveTemporaryFile(tempPath, storagePath);
    tempPath = null;
    const { previousPath } = await replaceSubmission({
      assignmentId,
      studentId: user.id,
      storagePath,
      originalFilename: validation.safeFilename,
      fileSize: uploaded.size,
    });
    if (previousPath && previousPath !== storagePath) {
      removeStoredFile(previousPath).catch((error: unknown) => {
        console.error("Could not remove replaced submission file", error);
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (tempPath) await removeTemporaryFile(tempPath);
    if (storagePath) {
      try {
        await removeStoredFile(storagePath);
      } catch (cleanupError) {
        console.error("Could not clean up failed submission upload", cleanupError);
      }
    }
    if (error instanceof UploadError) return jsonError(error.status, error.message.trim());
    console.error("Submission upload failed", error);
    return jsonError(500, "提交失败，请稍后重试。 ");
  }
}
