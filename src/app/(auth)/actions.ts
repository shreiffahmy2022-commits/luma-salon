"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { slugify } from "@/lib/util";

export type AuthState = { error?: string };

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const orgName = String(formData.get("orgName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!orgName || !name || !email || password.length < 8)
    return { error: "Fill all fields — password must be at least 8 characters." };
  if (await db.user.findUnique({ where: { email } }))
    return { error: "An account with this email already exists." };

  let slug = slugify(orgName) || "salon";
  if (await db.org.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const org = await db.org.create({ data: { name: orgName, slug } });
  const branch = await db.branch.create({ data: { orgId: org.id, name: "Main branch" } });
  const user = await db.user.create({
    data: { orgId: org.id, email, name, role: "OWNER", passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession({ userId: user.id, orgId: org.id, branchId: branch.id, branchName: branch.name, role: "OWNER", orgName: org.name, currency: org.currency });
  redirect("/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Invalid email or password." };
  const org = await db.org.findUniqueOrThrow({ where: { id: user.orgId } });
  const branch = await db.branch.findFirstOrThrow({ where: { orgId: org.id }, orderBy: { id: "asc" } });
  await createSession({ userId: user.id, orgId: org.id, branchId: branch.id, branchName: branch.name, role: user.role, orgName: org.name, currency: org.currency });
  redirect("/dashboard");
}

export async function logout() {
  destroySession();
  redirect("/login");
}
