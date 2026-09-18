import { deleteExpiredSession, findSessionUser } from "@/lib/db/users";
import { getCurrentSessionToken, hashSessionToken } from "@/lib/auth/session";

export async function getCurrentUser() {
  const token = await getCurrentSessionToken();
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const user = await findSessionUser(tokenHash);
  if (!user) await deleteExpiredSession(tokenHash);
  return user;
}
