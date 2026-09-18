import path from "node:path";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(name: string, fallback: number, minimum: number, maximum: number) {
  const value = process.env[name] ? Number(process.env[name]) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

export type AppConfig = {
  databaseUrl: string;
  uploadRoot: string;
  backupRoot: string;
  sessionSecret: string;
  sessionTtlDays: number;
  appUrl: URL;
  cookieSecure: boolean;
  maxUploadSize: number;
};

let cachedConfig: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  const appUrl = new URL(required("APP_URL"));
  if (appUrl.protocol !== "http:" && appUrl.protocol !== "https:") {
    throw new Error("APP_URL must use http or https.");
  }
  const sessionSecret = required("SESSION_SECRET");
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  const maxUploadSize = integer("MAX_UPLOAD_SIZE", 52_428_800, 1, 52_428_800);
  const cookieSecure = required("COOKIE_SECURE");
  if (cookieSecure !== "true" && cookieSecure !== "false") {
    throw new Error("COOKIE_SECURE must be true or false.");
  }

  cachedConfig = {
    databaseUrl: required("DATABASE_URL"),
    uploadRoot: path.resolve(required("UPLOAD_ROOT")),
    backupRoot: path.resolve(required("BACKUP_ROOT")),
    sessionSecret,
    sessionTtlDays: integer("SESSION_TTL_DAYS", 7, 1, 30),
    appUrl,
    cookieSecure: cookieSecure === "true",
    maxUploadSize,
  };
  return cachedConfig;
}
