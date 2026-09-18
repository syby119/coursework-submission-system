import ExcelJS from "exceljs";
import { formatDateTime } from "../time";
import type { Submission, User } from "../../types/database";

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
      score: submission?.score === null || !submission ? 0 : Number(submission.score),
    });
  }

  return workbook.xlsx.writeBuffer();
}
