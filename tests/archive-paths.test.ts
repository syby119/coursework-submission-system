import { describe, expect, it } from "vitest";
import {
  assignmentArchiveDirectory,
  assignmentArchiveFilename,
  assignmentGradeFilename,
  allAssignmentsArchiveDirectory,
  allAssignmentsArchiveFilename,
  studentArchiveDirectory,
} from "../lib/archive/paths";

describe("archive entry names", () => {
  it("keeps normal Chinese assignment and student names readable", () => {
    expect(assignmentArchiveFilename("作业 3")).toBe("作业 3.zip");
    expect(assignmentArchiveDirectory("作业 3")).toBe("作业 3");
    expect(assignmentGradeFilename("作业 3")).toBe("作业 3-成绩.xlsx");
    expect(allAssignmentsArchiveDirectory).toBe("全部作业和成绩");
    expect(allAssignmentsArchiveFilename).toBe("全部作业和成绩.zip");
    expect(studentArchiveDirectory("test001", "张三")).toBe("test001_张三");
  });

  it("does not permit a ZIP entry name to create nested or parent paths", () => {
    const directory = studentArchiveDirectory("../test001", "../../张三");

    expect(directory).not.toContain("/");
    expect(directory).not.toContain("\\");
  });
});
