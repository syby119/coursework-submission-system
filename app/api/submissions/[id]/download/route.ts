import { Readable } from "node:stream";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findSubmissionForDownload } from "@/lib/db/submissions";
import { openStoredFile } from "@/lib/storage/local";
import { isUuid } from "@/lib/validation/submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  return {
    pdf: "application/pdf",
    zip: "application/zip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }[extension ?? ""] ?? "application/octet-stream";
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 404 });
  const submission = await findSubmissionForDownload(id);
  if (!submission || (user.role !== "admin" && submission.student_id !== user.id)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const file = await openStoredFile(submission.storage_path);
    if (!file) return new NextResponse(null, { status: 404 });
    return new NextResponse(Readable.toWeb(file.stream) as ReadableStream, {
      headers: {
        "Content-Type": contentType(submission.original_filename),
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(submission.original_filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Submission download failed", error);
    return new NextResponse(null, { status: 500 });
  }
}
