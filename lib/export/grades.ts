import ExcelJS from "exceljs";
import { formatDateTime, isLateSubmission } from "../time";
import { DEFAULT_LOCALE, t, type Locale } from "../i18n";
import type { Assignment, Submission, User } from "../../types/database";

function scoreValue(submission: Submission | undefined) {
  const score = Number(submission?.score ?? 0);
  return Number.isFinite(score) ? score : 0;
}

export async function createGradeWorkbook(students: User[], submissions: Submission[], deadline: string, locale: Locale = DEFAULT_LOCALE) {
  const submissionsByStudent = new Map(submissions.map((submission) => [submission.student_id, submission]));
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t(locale, "archiveGrades"));

  worksheet.columns = [
    { header: t(locale, "studentNumber"), key: "studentNumber", width: 18 },
    { header: t(locale, "student"), key: "name", width: 18 },
    { header: t(locale, "status"), key: "status", width: 12 },
    { header: t(locale, "lastSubmittedTimezone"), key: "submittedAt", width: 30 },
    { header: t(locale, "score"), key: "score", width: 12 },
  ];
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const student of students) {
    const submission = submissionsByStudent.get(student.id);
    worksheet.addRow({
      studentNumber: student.student_number,
      name: student.name,
      status: submission ? isLateSubmission(submission.submitted_at, deadline) ? t(locale, "late") : t(locale, "submitted") : t(locale, "notSubmitted"),
      submittedAt: submission ? formatDateTime(submission.submitted_at, locale) : "",
      score: scoreValue(submission),
    });
  }

  return workbook.xlsx.writeBuffer();
}

export async function createGradeSummaryWorkbook(assignments: Assignment[], students: User[], submissions: Submission[], locale: Locale = DEFAULT_LOCALE) {
  const submissionsByAssignmentAndStudent = new Map(
    submissions.map((submission) => [`${submission.assignment_id}:${submission.student_id}`, submission]),
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t(locale, "archiveGradeSummary"));
  const headers = [t(locale, "studentNumber"), t(locale, "student"), ...assignments.map((assignment) => assignment.title)];

  worksheet.columns = headers.map((header, index) => ({
    header,
    key: String(index),
    width: index < 2 ? 18 : 14,
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];

  for (const student of students) {
    const scores = assignments.map((assignment) => scoreValue(submissionsByAssignmentAndStudent.get(`${assignment.id}:${student.id}`)));
    worksheet.addRow([student.student_number, student.name, ...scores]);
  }

  return workbook.xlsx.writeBuffer();
}
