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
import { LOCALE_COOKIE, localeFromValue, t, type Locale } from "@/lib/i18n";
import {
  hasAllowedMimeType,
  isUuid,
  validateSubmissionFile,
} from "@/lib/validation/submission";

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

async function streamSingleFile(request: NextRequest, tempPath: string, locale: Locale): Promise<UploadedFile> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) {
    throw new UploadError(415, t(locale, "multipartRequired"));
  }
  const requestBody = request.body;
  if (!requestBody) throw new UploadError(400, t(locale, "uploadContentEmpty"));

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
      throw new UploadError(400, t(locale, "uploadRequestInvalid"));
    }

    parser.on("file", (fieldname, file, info) => {
      if (fileSeen || fieldname !== "file") {
        file.resume();
        fail(new UploadError(400, t(locale, "oneFileOnly")));
        return;
      }
      fileSeen = true;
      filename = info.filename;
      mimeType = info.mimeType;
      writer = createWriteStream(tempPath, { flags: "wx", mode: 0o640 });
      writer.on("error", () => fail(new UploadError(500, t(locale, "unableToSaveFile"))));
      writer.on("finish", () => {
        writerFinished = true;
        finishIfComplete();
      });
      file.on("data", (chunk: Buffer) => {
        size += chunk.length;
      });
      file.on("limit", () => fail(new UploadError(413, t(locale, "fileTooLarge"))));
      file.on("error", () => fail(new UploadError(400, t(locale, "uploadInterrupted"))));
      file.pipe(writer);
    });
    parser.on("field", () => fail(new UploadError(400, t(locale, "uploadFieldsUnsupported"))));
    parser.on("filesLimit", () => fail(new UploadError(400, t(locale, "oneFileOnly"))));
    parser.on("error", () => fail(new UploadError(400, t(locale, "uploadRequestInvalid"))));
    parser.on("finish", () => {
      busboyFinished = true;
      if (!fileSeen) fail(new UploadError(400, t(locale, "selectSubmissionFile")));
      finishIfComplete();
    });

    Readable.fromWeb(requestBody as unknown as NodeReadableStream).on("error", () => fail(new UploadError(400, t(locale, "uploadInterrupted")))).pipe(parser);
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = await context.params;
  const locale = localeFromValue(request.cookies.get(LOCALE_COOKIE)?.value);
  if (!isUuid(assignmentId)) return jsonError(404, t(locale, "assignmentMissing"));
  if (!hasTrustedOrigin(request)) return jsonError(403, t(locale, "invalidRequestOrigin"));
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError(401, t(locale, "signInAsStudent"));

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > getConfig().maxUploadSize + 1_048_576) {
    return jsonError(413, t(locale, "fileTooLarge"));
  }
  const assignment = await findPublishedAssignment(assignmentId);
  if (!assignment) return jsonError(404, t(locale, "assignmentNotPublished"));

  let tempPath: string | null = null;
  let storagePath: string | null = null;
  try {
    await ensureUploadDirectories();
    tempPath = createTemporaryPath();
    const uploaded = await streamSingleFile(request, tempPath, locale);
    const validation = validateSubmissionFile(uploaded.filename, uploaded.size, locale);
    if (!validation.valid) throw new UploadError(400, validation.error);
    if (!hasAllowedMimeType(validation.extension, uploaded.mimeType)) {
      throw new UploadError(400, t(locale, "mimeMismatch"));
    }
    try {
      await validateSubmittedZip(tempPath);
    } catch (error) {
      if (error instanceof ZipArchiveError) throw new UploadError(400, t(locale, error.messageKey, error.values));
      throw error;
    }

    const currentAssignment = await findPublishedAssignment(assignmentId);
    if (!currentAssignment) {
      throw new UploadError(404, t(locale, "assignmentNotPublished"));
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
    return jsonError(500, t(locale, "submissionFailed"));
  }
}
