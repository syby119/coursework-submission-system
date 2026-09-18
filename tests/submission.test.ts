import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE,
  isSubmissionPathForUser,
  validateSubmissionFile,
} from "../lib/validation/submission";

describe("submission file validation", () => {
  it("accepts supported files within the configured limit", () => {
    expect(validateSubmissionFile("homework.PDF", 1024)).toMatchObject({
      valid: true,
      extension: "pdf",
    });
  });

  it("rejects unsupported extensions and oversize files", () => {
    expect(validateSubmissionFile("script.exe", 1024)).toMatchObject({ valid: false });
    expect(validateSubmissionFile("homework.zip", MAX_FILE_SIZE + 1)).toMatchObject({ valid: false });
  });

  it("requires the current assignment and user path prefix", () => {
    const assignmentId = "4ef225b5-ea44-41a9-a3cb-a2e70f41b18e";
    const studentId = "1d72459c-2925-48bd-9ca9-2597d394fe36";
    const objectId = "d5d3dca9-a4bc-46f4-9f72-8e8fb6e7ce36";
    expect(isSubmissionPathForUser(`${assignmentId}/${studentId}/${objectId}.docx`, assignmentId, studentId)).toBe(true);
    expect(isSubmissionPathForUser(`${assignmentId}/other-user/${objectId}.docx`, assignmentId, studentId)).toBe(false);
  });
});
