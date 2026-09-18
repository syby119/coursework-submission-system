import type { Readable } from "node:stream";
import { openPromise, type Entry, type ZipFile, validateFileName } from "yauzl";

const MEBIBYTE = 1024 * 1024;
export const MAX_ZIP_ENTRY_COUNT = 1_000;
export const MAX_ZIP_ENTRY_SIZE = 250 * MEBIBYTE;
export const MAX_ZIP_UNCOMPRESSED_SIZE = 500 * MEBIBYTE;

export class ZipArchiveError extends Error {}

export type PreparedZipEntry = {
  archivePath: string;
  entry: Entry;
  isDirectory: boolean;
};

export type PreparedZipArchive = {
  entries: PreparedZipEntry[];
  close: () => void;
  openReadStream: (entry: Entry) => Promise<Readable>;
};

function zipFilenameStem(filename: string) {
  const normalized = filename.normalize("NFKC");
  return normalized.toLowerCase().endsWith(".zip") ? normalized.slice(0, -4) : normalized;
}

function hasConflictingPath(path: string, isDirectory: boolean, files: Set<string>, directories: Set<string>) {
  const parts = path.split("/");
  for (let index = 1; index < parts.length; index += 1) {
    if (files.has(parts.slice(0, index).join("/"))) return true;
  }
  if (isDirectory) return files.has(path);
  return directories.has(path) || files.has(path) || [...files].some((file) => file.startsWith(`${path}/`));
}

/**
 * Converts a ZIP entry into the path that should appear in a student's exported
 * directory. A single top-level folder matching the uploaded ZIP filename is
 * removed, so "report.zip/report/..." becomes "report/..." after extraction.
 */
export function exportedZipEntryPath(fileName: string, uploadedFilename: string) {
  const yauzlError = validateFileName(fileName);
  if (yauzlError || fileName.includes("\\") || /^[A-Za-z]:/.test(fileName)) {
    throw new ZipArchiveError("压缩包内包含不安全的文件路径。");
  }

  const isDirectory = fileName.endsWith("/");
  const parts = fileName.split("/");
  if (isDirectory) parts.pop();
  if (!parts.length || parts.some((part) => !part || part === "." || part === "..")) {
    throw new ZipArchiveError("压缩包内包含不安全的文件路径。");
  }

  const archiveStem = zipFilenameStem(uploadedFilename);
  if (parts[0].normalize("NFKC").toLocaleLowerCase("en-US") === archiveStem.toLocaleLowerCase("en-US")) {
    parts.shift();
  }

  if (!parts.length) return null;
  return { archivePath: parts.join("/"), isDirectory };
}

function validateEntry(entry: Entry, entryCount: number, totalUncompressedSize: number) {
  if (entryCount > MAX_ZIP_ENTRY_COUNT) {
    throw new ZipArchiveError(`压缩包内文件数量不能超过 ${MAX_ZIP_ENTRY_COUNT} 个。`);
  }
  if (!entry.canDecodeFileData()) {
    throw new ZipArchiveError("压缩包包含加密文件或不支持的压缩格式。");
  }
  const unixMode = entry.externalFileAttributes >>> 16;
  if ((unixMode & 0o170000) === 0o120000) {
    throw new ZipArchiveError("压缩包不能包含符号链接。");
  }
  if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0 || entry.uncompressedSize > MAX_ZIP_ENTRY_SIZE) {
    throw new ZipArchiveError("压缩包内单个文件过大。");
  }
  if (totalUncompressedSize + entry.uncompressedSize > MAX_ZIP_UNCOMPRESSED_SIZE) {
    throw new ZipArchiveError("压缩包解压后的总大小不能超过 500 MB。");
  }
}

/** Opens, validates and keeps a ZIP available for streaming into an export. */
export async function prepareZipForExport(filePath: string, uploadedFilename: string): Promise<PreparedZipArchive> {
  try {
    const zipFile: ZipFile = await openPromise(filePath, {
      autoClose: false,
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true,
    });

    try {
      const entries: PreparedZipEntry[] = [];
      const files = new Set<string>();
      const directories = new Set<string>();
      let entryCount = 0;
      let totalUncompressedSize = 0;

      for await (const entry of zipFile.eachEntry()) {
        entryCount += 1;
        validateEntry(entry, entryCount, totalUncompressedSize);
        totalUncompressedSize += entry.uncompressedSize;

        const destination = exportedZipEntryPath(entry.fileName, uploadedFilename);
        if (!destination) continue;
        if (hasConflictingPath(destination.archivePath, destination.isDirectory, files, directories)) {
          throw new ZipArchiveError("压缩包内包含冲突的文件路径。");
        }

        if (destination.isDirectory) {
          if (directories.has(destination.archivePath)) continue;
          directories.add(destination.archivePath);
        } else {
          files.add(destination.archivePath);
        }
        entries.push({ ...destination, entry });
      }

      return {
        entries,
        close: () => zipFile.close(),
        openReadStream: (entry) => zipFile.openReadStreamPromise(entry),
      };
    } catch (error) {
      zipFile.close();
      throw error;
    }
  } catch (error) {
    if (error instanceof ZipArchiveError) throw error;
    throw new ZipArchiveError("提交的文件不是有效的 ZIP 压缩包。");
  }
}

export async function validateSubmittedZip(filePath: string) {
  const archive = await prepareZipForExport(filePath, "submission.zip");
  archive.close();
}
