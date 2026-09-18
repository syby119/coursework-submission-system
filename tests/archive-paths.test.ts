import { describe, expect, it } from "vitest";
import {
  assignmentArchiveFilename,
  studentArchiveDirectory,
  submissionArchiveFilename,
} from "../lib/archive/paths";

describe("archive entry names", () => {
  it("keeps normal Chinese assignment and student names readable", () => {
    expect(assignmentArchiveFilename("作业 3")).toBe("作业 3.zip");
    expect(studentArchiveDirectory("test001", "张三")).toBe("test001_张三");
    expect(submissionArchiveFilename("实验报告.PDF")).toBe("实验报告.pdf");
  });

  it("does not permit a ZIP entry name to create nested or parent paths", () => {
    const directory = studentArchiveDirectory("../test001", "../../张三");
    const filename = submissionArchiveFilename("../../private.docx");

    expect(directory).not.toContain("/");
    expect(directory).not.toContain("\\");
    expect(filename).not.toContain("/");
    expect(filename).not.toContain("\\");
    expect(filename).toBe(".._.._private.docx");
  });
});
