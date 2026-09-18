import { stat } from "node:fs/promises";
import { ZipFile } from "yazl";
import { prepareZipForExport, type PreparedZipArchive } from "@/lib/archive/zip";
import { studentArchiveDirectory } from "@/lib/archive/paths";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { resolveStoredPath } from "@/lib/storage/local";
import type { Submission, User } from "@/types/database";

/** Highest zlib compression level supported by ZIP/DEFLATE. */
export const EXPORT_ZIP_COMPRESSION_LEVEL = 9;

type ExportedArchive = { archive: PreparedZipArchive };

/** Adds one assignment's student folders and extracted submission contents to a ZIP. */
export async function addAssignmentFilesToZip(
  zip: ZipFile,
  assignmentDirectory: string,
  students: User[],
  submissions: Submission[],
  locale: Locale = DEFAULT_LOCALE,
) {
  const archivesByStudent = new Map<string, ExportedArchive>();
  try {
    for (const submission of submissions) {
      const absolutePath = resolveStoredPath(submission.storage_path);
      if (!absolutePath) throw new Error(`Invalid submission storage path: ${submission.id}`);

      const file = await stat(absolutePath);
      if (!file.isFile()) throw new Error(`Submission is not a regular file: ${submission.id}`);

      const archive = await prepareZipForExport(absolutePath, submission.original_filename);
      archivesByStudent.get(submission.student_id)?.archive.close();
      archivesByStudent.set(submission.student_id, { archive });
    }
  } catch (error) {
    for (const { archive } of archivesByStudent.values()) archive.close();
    throw error;
  }

  zip.addEmptyDirectory(assignmentDirectory);
  for (const student of students) {
    const directory = studentArchiveDirectory(student.student_number, student.name, locale);
    const studentDirectory = `${assignmentDirectory}/${directory}`;
    zip.addEmptyDirectory(studentDirectory);

    const submission = archivesByStudent.get(student.id);
    if (!submission) continue;

    for (const entry of submission.archive.entries) {
      const entryPath = `${studentDirectory}/${entry.archivePath}`;
      if (entry.isDirectory) {
        zip.addEmptyDirectory(entryPath);
        continue;
      }
      zip.addReadStreamLazy(entryPath, {
        size: entry.entry.uncompressedSize,
        compressionLevel: EXPORT_ZIP_COMPRESSION_LEVEL,
      }, (callback) => {
        void submission.archive.openReadStream(entry.entry)
          .then((stream) => callback(null, stream))
          .catch((error: unknown) => callback(error, null as unknown as NodeJS.ReadableStream));
      });
    }
  }

  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    for (const { archive } of archivesByStudent.values()) archive.close();
  };
}
