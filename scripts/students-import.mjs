import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import pg from "pg";
import { requiredEnv } from "./env.mjs";

const { Pool } = pg;

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  values.push(value.trim());
  return values;
}

async function importStudents() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Usage: pnpm students:import -- students.csv");
  const lines = (await readFile(filename, "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines.shift() ?? "");
  if (header.join(",") !== "student_number,name,password") {
    throw new Error("CSV header must be: student_number,name,password");
  }
  const records = lines.map((line, index) => {
    const [studentNumber, name, password, ...extra] = parseCsvLine(line);
    if (extra.length || !studentNumber || !name || !password || password.length < 12) {
      throw new Error(`Invalid row ${index + 2}; a 12+ character password is required.`);
    }
    return { studentNumber, name, password };
  });
  if (new Set(records.map((record) => record.studentNumber)).size !== records.length) {
    throw new Error("CSV contains duplicate student numbers.");
  }

  const pool = new Pool({ connectionString: requiredEnv("DATABASE_URL") });
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const record of records) {
      const passwordHash = await bcrypt.hash(record.password, 12);
      await client.query(
        "insert into users (student_number, name, password_hash, role) values ($1, $2, $3, 'student')",
        [record.studentNumber, record.name, passwordHash],
      );
    }
    await client.query("commit");
    console.log(`Imported ${records.length} students.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importStudents().catch((error) => {
  console.error("Student import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
