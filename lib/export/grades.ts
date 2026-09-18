import ExcelJS from "exceljs";
import { formatDateTime } from "../time";
import type { Assignment, Submission, User } from "../../types/database";

function scoreValue(submission: Submission | undefined) {
  const score = Number(submission?.score ?? 0);
  return Number.isFinite(score) ? score : 0;
}

export async function createGradeWorkbook(students: User[], submissions: Submission[]) {
  const submissionsByStudent = new Map(submissions.map((submission) => [submission.student_id, submission]));
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("成绩");

  worksheet.columns = [
    { header: "学号", key: "studentNumber", width: 18 },
    { header: "姓名", key: "name", width: 18 },
    { header: "提交状态", key: "status", width: 12 },
    { header: "最后提交时间（北京时间）", key: "submittedAt", width: 30 },
    { header: "分数", key: "score", width: 12 },
  ];
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const student of students) {
    const submission = submissionsByStudent.get(student.id);
    worksheet.addRow({
      studentNumber: student.student_number,
      name: student.name,
      status: submission ? "已提交" : "未提交",
      submittedAt: submission ? formatDateTime(submission.submitted_at) : "",
      score: scoreValue(submission),
    });
  }

  return workbook.xlsx.writeBuffer();
}

export async function createGradeSummaryWorkbook(assignments: Assignment[], students: User[], submissions: Submission[]) {
  const submissionsByAssignmentAndStudent = new Map(
    submissions.map((submission) => [`${submission.assignment_id}:${submission.student_id}`, submission]),
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("成绩汇总");
  const headers = ["学号", "姓名", ...assignments.map((assignment) => assignment.title)];

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
