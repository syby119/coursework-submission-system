import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import pg from "pg";
import { requiredEnv } from "./env.mjs";

const { Pool } = pg;
const INITIAL_STUDENT_PASSWORD = "123456";

function cellText(worksheet, rowNumber, columnNumber) {
  return String(worksheet.getRow(rowNumber).getCell(columnNumber).text).trim();
}

async function readStudents(filename) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("The workbook does not contain a worksheet.");

  const header = [cellText(worksheet, 1, 1), cellText(worksheet, 1, 2)];
  if (header[0] !== "姓名" || header[1] !== "学号") {
    throw new Error("The first two columns must be headed 姓名 and 学号.");
  }

  const students = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const name = cellText(worksheet, rowNumber, 1);
    const studentNumber = cellText(worksheet, rowNumber, 2);
    if (!name && !studentNumber) continue;
    if (!name || !studentNumber) throw new Error(`Row ${rowNumber} must contain both 姓名 and 学号.`);
    if (name.length > 100 || studentNumber.length > 64) throw new Error(`Row ${rowNumber} contains a value that is too long.`);
    students.push({ name, studentNumber, rowNumber });
  }

  if (!students.length) throw new Error("The workbook does not contain any students.");
  const studentNumbers = students.map((student) => student.studentNumber);
  if (new Set(studentNumbers).size !== studentNumbers.length) {
    throw new Error("The workbook contains duplicate student numbers.");
  }
  return students;
}

async function importStudents() {
  const filename = process.argv.slice(2).find((argument) => argument !== "--");
  if (!filename) throw new Error("Usage: pnpm students:import-xlsx -- <students.xlsx>");

  const students = await readStudents(filename);
  const passwordHashes = await Promise.all(students.map(() => bcrypt.hash(INITIAL_STUDENT_PASSWORD, 12)));
  const pool = new Pool({ connectionString: requiredEnv("DATABASE_URL") });
  const client = await pool.connect();

  try {
    await client.query("begin");
    const studentNumbers = students.map((student) => student.studentNumber);
    const existing = await client.query("select student_number from users where student_number = any($1::text[])", [studentNumbers]);
    if (existing.rowCount) {
      const values = existing.rows.map((row) => row.student_number).join(", ");
      throw new Error(`Student numbers already exist: ${values}`);
    }

    for (const [index, student] of students.entries()) {
      await client.query(
        "insert into users (student_number, name, password_hash, role) values ($1, $2, $3, 'student')",
        [student.studentNumber, student.name, passwordHashes[index]],
      );
    }
    await client.query("commit");
    console.log(`Imported ${students.length} students from ${filename}.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importStudents().catch((error) => {
  console.error("Student Excel import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
