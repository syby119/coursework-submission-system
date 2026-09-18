import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseStudentRosterXlsx, StudentRosterImportError } from "../lib/students/import-xlsx";

async function rosterBuffer(rows: Array<[string, string]>) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("students");
  worksheet.addRow(["姓名", "学号"]);
  for (const row of rows) worksheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer).buffer;
}

describe("student Excel roster import", () => {
  it("reads names and student numbers from the first worksheet", async () => {
    await expect(parseStudentRosterXlsx(await rosterBuffer([
      ["Student A", "20260001"],
      ["Student B", "20260002"],
    ]))).resolves.toEqual([
      { name: "Student A", studentNumber: "20260001" },
      { name: "Student B", studentNumber: "20260002" },
    ]);
  });

  it("rejects duplicate student numbers without producing a partial roster", async () => {
    await expect(parseStudentRosterXlsx(await rosterBuffer([
      ["Student A", "20260001"],
      ["Student B", "20260001"],
    ]))).rejects.toMatchObject({
      code: "duplicateStudentNumbers",
      details: { studentNumbers: ["20260001"] },
    } satisfies Partial<StudentRosterImportError>);
  });

  it("reports the exact row and reason for an invalid roster row", async () => {
    await expect(parseStudentRosterXlsx(await rosterBuffer([
      ["Student A", "20260001"],
      ["", "20260002"],
    ]))).rejects.toMatchObject({
      code: "missingName",
      details: { rowNumber: 3 },
    } satisfies Partial<StudentRosterImportError>);
  });
});
