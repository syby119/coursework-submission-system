import { NextResponse } from "next/server";
import { assignmentGradeFilename } from "@/lib/archive/paths";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAssignment } from "@/lib/db/assignments";
import { listAssignmentSubmissions, listStudents } from "@/lib/db/submissions";
import { createGradeWorkbook } from "@/lib/export/grades";
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

    const workbook = await createGradeWorkbook(students, submissions, assignment.deadline);
    const filename = assignmentGradeFilename(assignment.title);
    return new NextResponse(Buffer.from(workbook), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="grades.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Grade export failed", error);
    return new NextResponse(null, { status: 500 });
  }
}
