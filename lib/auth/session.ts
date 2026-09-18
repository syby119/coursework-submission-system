import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import { query, transaction } from "@/lib/db";

export const SESSION_COOKIE = "homework_session";

export function hashSessionToken(token: string) {
  return createHmac("sha256", getConfig().sessionSecret).update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: getConfig().cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + getConfig().sessionTtlDays * 86_400_000);
  await query(
    "insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)",
    [hashSessionToken(token), userId, expires.toISOString()],
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expires));
}

export async function changePasswordAndRotateSessions(userId: string, passwordHash: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + getConfig().sessionTtlDays * 86_400_000);

  await transaction(async (client) => {
    const result = await client.query("update users set password_hash = $1 where id = $2", [passwordHash, userId]);
    if (result.rowCount !== 1) throw new Error("User not found while changing password.");

    await client.query("delete from sessions where user_id = $1", [userId]);
    await client.query(
      "insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)",
      [hashSessionToken(token), userId, expires.toISOString()],
    );
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expires));
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [hashSessionToken(token)]);
  cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function getCurrentSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
