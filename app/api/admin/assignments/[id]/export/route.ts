import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { NextResponse } from "next/server";
import { prepareZipForExport, type PreparedZipArchive } from "@/lib/archive/zip";
import { createGradeWorkbook } from "@/lib/export/grades";
import {
  assignmentArchiveDirectory,
  assignmentArchiveFilename,
  studentArchiveDirectory,
} from "@/lib/archive/paths";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAssignment } from "@/lib/db/assignments";
import { listAssignmentSubmissions, listStudents } from "@/lib/db/submissions";
import { resolveStoredPath } from "@/lib/storage/local";
import { isUuid } from "@/lib/validation/submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportedArchive = {
  archive: PreparedZipArchive;
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
    const archivesByStudent = new Map<string, ExportedArchive>();
    try {
      for (const submission of submissions) {
        const absolutePath = resolveStoredPath(submission.storage_path);
        if (!absolutePath) throw new Error(`Invalid submission storage path: ${submission.id}`);

        const file = await stat(absolutePath);
        if (!file.isFile()) throw new Error(`Submission is not a regular file: ${submission.id}`);

        const archive = await prepareZipForExport(absolutePath, submission.original_filename);
        archivesByStudent.get(submission.student_id)?.archive.close();
        archivesByStudent.set(submission.student_id, { archive });
      }
    } catch (error) {
      for (const { archive } of archivesByStudent.values()) archive.close();
      throw error;
    }

    const zip = new ZipFile();
    let sourceArchivesClosed = false;
    const closeSourceArchives = () => {
      if (sourceArchivesClosed) return;
      sourceArchivesClosed = true;
      for (const { archive } of archivesByStudent.values()) archive.close();
    };
    zip.outputStream.once("end", closeSourceArchives);
    zip.outputStream.once("close", closeSourceArchives);
    zip.outputStream.on("error", (error) => {
      console.error("Assignment archive stream failed", error);
      closeSourceArchives();
    });

    const rootDirectory = assignmentArchiveDirectory(assignment.title);
    zip.addEmptyDirectory(rootDirectory);
    const gradeWorkbook = await createGradeWorkbook(students, submissions);
    zip.addBuffer(Buffer.from(gradeWorkbook), `${rootDirectory}/成绩.xlsx`, { compress: false });

    for (const student of students) {
      const directory = studentArchiveDirectory(student.student_number, student.name);
      const archiveDirectory = `${rootDirectory}/${directory}`;
      zip.addEmptyDirectory(archiveDirectory);

      const submission = archivesByStudent.get(student.id);
      if (submission) {
        for (const entry of submission.archive.entries) {
          const entryPath = `${archiveDirectory}/${entry.archivePath}`;
          if (entry.isDirectory) {
            zip.addEmptyDirectory(entryPath);
            continue;
          }
          zip.addReadStreamLazy(entryPath, { size: entry.entry.uncompressedSize }, (callback) => {
            void submission.archive.openReadStream(entry.entry)
              .then((stream) => callback(null, stream))
              .catch((error: unknown) => callback(error, null as unknown as NodeJS.ReadableStream));
          });
        }
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
