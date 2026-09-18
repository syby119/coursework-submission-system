import ExcelJS from "exceljs";

export const MAX_STUDENT_IMPORT_ROWS = 500;

export type StudentRosterEntry = {
  name: string;
  studentNumber: string;
};

export type StudentRosterImportErrorCode =
  | "missingWorksheet"
  | "invalidHeaders"
  | "missingName"
  | "missingStudentNumber"
  | "nameTooLong"
  | "studentNumberTooLong"
  | "tooManyRows"
  | "emptyRoster"
  | "duplicateStudentNumbers";

export class StudentRosterImportError extends Error {
  constructor(
    readonly code: StudentRosterImportErrorCode,
    readonly details: { rowNumber?: number; headers?: [string, string]; studentNumbers?: string[] } = {},
  ) {
    super(code);
    this.name = "StudentRosterImportError";
  }
}

function cellText(worksheet: ExcelJS.Worksheet, rowNumber: number, columnNumber: number) {
  return String(worksheet.getRow(rowNumber).getCell(columnNumber).text).trim();
}

export async function parseStudentRosterXlsx(data: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new StudentRosterImportError("missingWorksheet");

  const header = [cellText(worksheet, 1, 1), cellText(worksheet, 1, 2)];
  if (header[0] !== "姓名" || header[1] !== "学号") {
    throw new StudentRosterImportError("invalidHeaders", { headers: [header[0], header[1]] });
  }

  const students: StudentRosterEntry[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const name = cellText(worksheet, rowNumber, 1);
    const studentNumber = cellText(worksheet, rowNumber, 2);
    if (!name && !studentNumber) continue;
    if (!name) throw new StudentRosterImportError("missingName", { rowNumber });
    if (!studentNumber) throw new StudentRosterImportError("missingStudentNumber", { rowNumber });
    if (name.length > 100) throw new StudentRosterImportError("nameTooLong", { rowNumber });
    if (studentNumber.length > 64) throw new StudentRosterImportError("studentNumberTooLong", { rowNumber });
    students.push({ name, studentNumber });
    if (students.length > MAX_STUDENT_IMPORT_ROWS) throw new StudentRosterImportError("tooManyRows");
  }

  if (!students.length) throw new StudentRosterImportError("emptyRoster");
  const counts = new Map<string, number>();
  for (const student of students) counts.set(student.studentNumber, (counts.get(student.studentNumber) ?? 0) + 1);
  const duplicateStudentNumbers = [...counts].filter(([, count]) => count > 1).map(([studentNumber]) => studentNumber);
  if (duplicateStudentNumbers.length) {
    throw new StudentRosterImportError("duplicateStudentNumbers", { studentNumbers: duplicateStudentNumbers.slice(0, 10) });
  }
  return students;
}
