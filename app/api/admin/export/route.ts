import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { type NextRequest, NextResponse } from "next/server";
import {
  allAssignmentsArchiveDirectory,
  allAssignmentsArchiveFilename,
  assignmentArchiveDirectory,
} from "@/lib/archive/paths";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAllAssignments } from "@/lib/db/assignments";
import { listAssignmentSubmissions, listStudents } from "@/lib/db/submissions";
import { addAssignmentFilesToZip, EXPORT_ZIP_COMPRESSION_LEVEL } from "@/lib/export/assignment-files";
import { createGradeSummaryWorkbook } from "@/lib/export/grades";
import type { Assignment, Submission } from "@/types/database";
import { LOCALE_COOKIE, localeFromValue, t, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assignmentDirectories(assignments: Assignment[], locale: Locale) {
  const baseNames = assignments.map((assignment) => {
    const directory = assignmentArchiveDirectory(assignment.title, locale);
    const gradeSummaryFilename = `${t(locale, "archiveGradeSummary")}.xlsx`;
    return directory === gradeSummaryFilename ? `${gradeSummaryFilename}-${t(locale, "archiveAssignmentFallback")}` : directory;
  });
  const nameCounts = new Map<string, number>();
  for (const name of baseNames) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);

  return new Map(assignments.map((assignment, index) => {
    const baseName = baseNames[index];
    const directory = nameCounts.get(baseName) === 1 ? baseName : `${baseName}-${assignment.id.slice(0, 8)}`;
    return [assignment.id, directory];
  }));
}

export async function GET(request: NextRequest) {
  const locale = localeFromValue(request.cookies.get(LOCALE_COOKIE)?.value);
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new NextResponse(null, { status: 404 });

  try {
    const [assignments, students] = await Promise.all([listAllAssignments(), listStudents()]);
    const submissionsByAssignment = new Map<string, Submission[]>();
    const submissionGroups = await Promise.all(assignments.map(async (assignment) => [
      assignment.id,
      await listAssignmentSubmissions(assignment.id),
    ] as const));
    for (const [assignmentId, submissions] of submissionGroups) submissionsByAssignment.set(assignmentId, submissions);

    const zip = new ZipFile();
    const rootDirectory = allAssignmentsArchiveDirectory(locale);
    zip.addEmptyDirectory(rootDirectory);
    const gradeWorkbook = await createGradeSummaryWorkbook(
      assignments,
      students,
      submissionGroups.flatMap(([, submissions]) => submissions),
      locale,
    );
    zip.addBuffer(Buffer.from(gradeWorkbook), `${rootDirectory}/${t(locale, "archiveGradeSummary")}.xlsx`, {
      compressionLevel: EXPORT_ZIP_COMPRESSION_LEVEL,
    });

    const closeFunctions: Array<() => void> = [];
    try {
      const directories = assignmentDirectories(assignments, locale);
      for (const assignment of assignments) {
        const directory = directories.get(assignment.id);
        if (!directory) throw new Error(`Missing archive directory for assignment: ${assignment.id}`);
        closeFunctions.push(await addAssignmentFilesToZip(
          zip,
          `${rootDirectory}/${directory}`,
          students,
          submissionsByAssignment.get(assignment.id) ?? [],
          locale,
        ));
      }
    } catch (error) {
      for (const close of closeFunctions) close();
      throw error;
    }

    let sourcesClosed = false;
    const closeSources = () => {
      if (sourcesClosed) return;
      sourcesClosed = true;
      for (const close of closeFunctions) close();
    };
    zip.outputStream.once("end", closeSources);
    zip.outputStream.once("close", closeSources);
    zip.outputStream.on("error", (error) => {
      console.error("Full assignment export stream failed", error);
      closeSources();
    });

    zip.end();
    return new NextResponse(Readable.toWeb(zip.outputStream as unknown as Readable) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="all-assignments.zip"; filename*=UTF-8''${encodeURIComponent(allAssignmentsArchiveFilename(locale))}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Full assignment export failed", error);
    return new NextResponse(null, { status: 500 });
  }
}
