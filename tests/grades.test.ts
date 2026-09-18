import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createGradeSummaryWorkbook, createGradeWorkbook } from "../lib/export/grades";
import type { Assignment, Submission, User } from "../types/database";

const students: User[] = [
  { id: "student-1", student_number: "20260001", name: "学生甲", role: "student", created_at: "", updated_at: "" },
  { id: "student-2", student_number: "20260002", name: "学生乙", role: "student", created_at: "", updated_at: "" },
];

const submissions: Submission[] = [
  {
    id: "submission-1",
    assignment_id: "assignment-1",
    student_id: "student-1",
    storage_path: "assignments/assignment-1/student-1/file.zip",
    original_filename: "homework.zip",
    file_size: 1024,
    score: "88.5",
    submitted_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
  },
];

const assignments: Assignment[] = [
  { id: "assignment-1", title: "作业一", description: "", published_at: "", deadline: "", created_at: "", updated_at: "", created_by: "admin" },
  { id: "assignment-2", title: "作业二", description: "", published_at: "", deadline: "", created_at: "", updated_at: "", created_by: "admin" },
];

describe("grade workbook", () => {
  it("includes every student and exports ungraded scores as zero", async () => {
    const buffer = await createGradeWorkbook(students, submissions);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("成绩");

    expect(sheet?.getCell("A2").value).toBe("20260001");
    expect(sheet?.getCell("E2").value).toBe(88.5);
    expect(sheet?.getCell("A3").value).toBe("20260002");
    expect(sheet?.getCell("E3").value).toBe(0);
  });

  it("summarizes every assignment score per student", async () => {
    const buffer = await createGradeSummaryWorkbook(assignments, students, submissions);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("成绩汇总");

    expect(sheet?.getCell("C1").value).toBe("作业一");
    expect(sheet?.getCell("D1").value).toBe("作业二");
    expect(sheet?.getCell("C2").value).toBe(88.5);
    expect(sheet?.getCell("D2").value).toBe(0);
    expect(sheet?.getCell("E2").value).toBe(88.5);
  });
});
