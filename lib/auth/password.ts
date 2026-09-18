import bcrypt from "bcryptjs";

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function validateNewPassword(currentPassword: string, newPassword: string, confirmation: string) {
  if (!currentPassword || !newPassword || !confirmation) return "请填写当前密码、新密码和确认密码。";
  if (newPassword !== confirmation) return "两次输入的新密码不一致。";
  if (newPassword === currentPassword) return "新密码不能与当前密码相同。";
  return null;
}
