import { describe, expect, it } from "vitest";
import { validateNewPassword } from "../lib/auth/password";

describe("validateNewPassword", () => {
  it("requires all password fields", () => {
    expect(validateNewPassword("", "new-password-1", "new-password-1")).toBe("请填写当前密码、新密码和确认密码。");
  });

  it("does not impose a password length requirement", () => {
    expect(validateNewPassword("old-password-1", "1", "1")).toBeNull();
  });

  it("rejects a different confirmation and unchanged password", () => {
    expect(validateNewPassword("old-password-1", "new-password-1", "new-password-2")).toBe("两次输入的新密码不一致。");
    expect(validateNewPassword("same-password", "same-password", "same-password")).toBe("新密码不能与当前密码相同。");
  });

  it("accepts a valid new password", () => {
    expect(validateNewPassword("old-password-1", "new-password-1", "new-password-1")).toBeNull();
  });
});
