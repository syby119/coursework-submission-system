import { mkdtemp, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { finished } from "node:stream/promises";
import { ZipFile } from "yazl";
import { describe, expect, it } from "vitest";
import { ZipArchiveError, exportedZipEntryPath, prepareZipForExport } from "../lib/archive/zip";

async function createZip(outputPath: string) {
  const zip = new ZipFile();
  zip.addEmptyDirectory("homework/empty");
  zip.addBuffer(Buffer.from("report"), "homework/report.txt");
  const output = createWriteStream(outputPath);
  zip.outputStream.pipe(output);
  zip.end();
  await finished(output);
}

describe("submitted ZIP archives", () => {
  it("removes only a top-level folder that matches the ZIP filename", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "coursework-zip-"));
    const zipPath = path.join(directory, "homework.zip");
    try {
      await createZip(zipPath);
      const archive = await prepareZipForExport(zipPath, "homework.zip");
      expect(archive.entries.map((entry) => entry.archivePath)).toEqual(["empty", "report.txt"]);
      archive.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects ZIP paths that could escape a student's directory", () => {
    expect(() => exportedZipEntryPath("../private.txt", "homework.zip")).toThrow(ZipArchiveError);
    expect(() => exportedZipEntryPath("folder\\private.txt", "homework.zip")).toThrow(ZipArchiveError);
  });
});
