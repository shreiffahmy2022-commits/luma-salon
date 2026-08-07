import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export type Session = {
  userId: string;
  orgId: string;
  branchId: string;
  branchName: string;
  role: string;
  orgName: string;
  currency: string;
};

export async function createSession(s: Session) {
  const jwt = await new SignJWT(s as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
  cookies().set("session", jwt, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function getSession(): Promise<Session | null> {
  const c = cookies().get("session")?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export function destroySession() {
  cookies().delete("session");
}
