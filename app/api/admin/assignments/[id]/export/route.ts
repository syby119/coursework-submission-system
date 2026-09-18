import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { NextResponse } from "next/server";
import {
  assignmentArchiveDirectory,
  assignmentArchiveFilename,
  studentArchiveDirectory,
  submissionArchiveFilename,
} from "@/lib/archive/paths";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAssignment } from "@/lib/db/assignments";
import { listAssignmentSubmissions, listStudents } from "@/lib/db/submissions";
import { resolveStoredPath } from "@/lib/storage/local";
import { isUuid } from "@/lib/validation/submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportedFile = {
  absolutePath: string;
  filename: string;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new NextResponse(null, { status: 404 });

  try {
    const [assignment, students, submissions] = await Promise.all([
      findAssignment(id),
      listStudents(),
      listAssignmentSubmissions(id),
    ]);
    if (!assignment) return new NextResponse(null, { status: 404 });

    // Verify every file before starting the response. That prevents delivering
    // a partial archive if an old database row points to a missing file.
    const exportedFiles = await Promise.all(
      submissions.map(async (submission) => {
        const absolutePath = resolveStoredPath(submission.storage_path);
        if (!absolutePath) throw new Error(`Invalid submission storage path: ${submission.id}`);

        const file = await stat(absolutePath);
        if (!file.isFile()) throw new Error(`Submission is not a regular file: ${submission.id}`);

        return [
          submission.student_id,
          {
            absolutePath,
            filename: submissionArchiveFilename(submission.original_filename),
          },
        ] as const;
      }),
    );
    const filesByStudent = new Map<string, ExportedFile>(exportedFiles);

    const zip = new ZipFile();
    zip.outputStream.on("error", (error) => {
      console.error("Assignment archive stream failed", error);
    });

    const rootDirectory = assignmentArchiveDirectory(assignment.title);
    zip.addEmptyDirectory(rootDirectory);

    for (const student of students) {
      const directory = studentArchiveDirectory(student.student_number, student.name);
      const archiveDirectory = `${rootDirectory}/${directory}`;
      zip.addEmptyDirectory(archiveDirectory);

      const submission = filesByStudent.get(student.id);
      if (submission) {
        zip.addFile(submission.absolutePath, `${archiveDirectory}/${submission.filename}`);
      }
    }

    zip.end();
    const archiveFilename = assignmentArchiveFilename(assignment.title);
    return new NextResponse(Readable.toWeb(zip.outputStream as unknown as Readable) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="assignment.zip"; filename*=UTF-8''${encodeURIComponent(archiveFilename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Assignment archive export failed", error);
    return new NextResponse(null, { status: 500 });
  }
}
