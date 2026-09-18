import { describe, expect, it } from "vitest";
import {
  assignmentArchiveDirectory,
  assignmentArchiveFilename,
  studentArchiveDirectory,
} from "../lib/archive/paths";

describe("archive entry names", () => {
  it("keeps normal Chinese assignment and student names readable", () => {
    expect(assignmentArchiveFilename("作业 3")).toBe("作业 3.zip");
    expect(assignmentArchiveDirectory("作业 3")).toBe("作业 3");
    expect(studentArchiveDirectory("test001", "张三")).toBe("test001_张三");
  });

  it("does not permit a ZIP entry name to create nested or parent paths", () => {
    const directory = studentArchiveDirectory("../test001", "../../张三");

    expect(directory).not.toContain("/");
    expect(directory).not.toContain("\\");
  });
});
