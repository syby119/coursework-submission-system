import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/lib/config";

const storedPathPattern = /^assignments\/[0-9a-f]{8}-[0-9a-f-]{27}\/[0-9a-f]{8}-[0-9a-f-]{27}\/[0-9a-f]{8}-[0-9a-f-]{27}\.(pdf|zip|doc|docx)$/i;

export async function ensureUploadDirectories() {
  const root = getConfig().uploadRoot;
  await mkdir(path.join(root, ".tmp"), { recursive: true, mode: 0o750 });
  await mkdir(path.join(root, "assignments"), { recursive: true, mode: 0o750 });
}

export function createTemporaryPath() {
  return path.join(getConfig().uploadRoot, ".tmp", `${randomUUID()}.part`);
}

export function createSubmissionStoragePath(assignmentId: string, studentId: string, extension: string) {
  return `assignments/${assignmentId}/${studentId}/${randomUUID()}.${extension}`;
}

export function resolveStoredPath(storagePath: string) {
  if (!storedPathPattern.test(storagePath)) return null;
  const root = getConfig().uploadRoot;
  const resolved = path.resolve(root, storagePath);
  if (!resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

export async function moveTemporaryFile(tempPath: string, storagePath: string) {
  const finalPath = resolveStoredPath(storagePath);
  if (!finalPath) throw new Error("Invalid generated storage path.");
  await mkdir(path.dirname(finalPath), { recursive: true, mode: 0o750 });
  await rename(tempPath, finalPath);
  await chmod(finalPath, 0o640);
  return finalPath;
}

export async function removeStoredFile(storagePath: string) {
  const finalPath = resolveStoredPath(storagePath);
  if (!finalPath) return false;
  try {
    await rm(finalPath);
    return true;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") return true;
    throw error;
  }
}

export async function removeTemporaryFile(tempPath: string) {
  await rm(tempPath, { force: true });
}

export async function openStoredFile(storagePath: string) {
  const finalPath = resolveStoredPath(storagePath);
  if (!finalPath) return null;
  try {
    const file = await stat(finalPath);
    if (!file.isFile()) return null;
    return { stream: createReadStream(finalPath), size: file.size };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
