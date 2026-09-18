import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { NextResponse } from "next/server";
import { addAssignmentFilesToZip } from "@/lib/export/assignment-files";
import {
  assignmentArchiveDirectory,
  assignmentArchiveFilename,
} from "@/lib/archive/paths";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAssignment } from "@/lib/db/assignments";
import { listAssignmentSubmissions, listStudents } from "@/lib/db/submissions";
import { isUuid } from "@/lib/validation/submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const zip = new ZipFile();
    const closeSourceArchives = await addAssignmentFilesToZip(zip, assignmentArchiveDirectory(assignment.title), students, submissions);
    let sourceArchivesClosed = false;
    const closeSources = () => {
      if (sourceArchivesClosed) return;
      sourceArchivesClosed = true;
      closeSourceArchives();
    };
    zip.outputStream.once("end", closeSources);
    zip.outputStream.once("close", closeSources);
    zip.outputStream.on("error", (error) => {
      console.error("Assignment archive stream failed", error);
      closeSources();
    });

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
