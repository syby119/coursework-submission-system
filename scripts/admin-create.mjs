import { stdin as input } from "node:process";
import bcrypt from "bcryptjs";
import pg from "pg";
import { requiredEnv } from "./env.mjs";

const { Pool } = pg;

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readPassword() {
  if (!process.argv.includes("--password-stdin")) {
    throw new Error("Use --password-stdin and pipe a password instead of putting it in shell history.");
  }
  let password = "";
  for await (const chunk of input) password += chunk;
  password = password.trimEnd();
  if (password.length < 12) throw new Error("Password must contain at least 12 characters.");
  return password;
}

async function createAdmin() {
  const studentNumber = option("--student-number")?.trim();
  const name = option("--name")?.trim();
  if (!studentNumber || !name) throw new Error("Usage: --student-number <id> --name <name> --password-stdin");
  const password = await readPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const pool = new Pool({ connectionString: requiredEnv("DATABASE_URL") });
  try {
    const { rows } = await pool.query(
      "insert into users (student_number, name, password_hash, role) values ($1, $2, $3, 'admin') returning id",
      [studentNumber, name, passwordHash],
    );
    console.log(`Created admin ${studentNumber} (${rows[0].id}).`);
  } finally {
    await pool.end();
  }
}

createAdmin().catch((error) => {
  console.error("Admin creation failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
