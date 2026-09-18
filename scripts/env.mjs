import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
