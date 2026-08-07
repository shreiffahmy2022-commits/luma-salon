"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, requireSession } from "@/lib/session";
import { slugify } from "@/lib/util";

export async function updateOrg(formData: FormData) {
  const s = await requireSession();
  const name = String(formData.get("name") || "").trim();
  const currency = String(formData.get("currency") || "AED").trim().toUpperCase().slice(0, 4) || "AED";
  if (!name) return;
  await db.org.update({ where: { id: s.orgId }, data: { name, currency } });
  await createSession({ ...s, orgName: name, currency });
  revalidatePath("/", "layout");
}

export type SlugState = { ok?: string; error?: string };

/**
 * Change the public booking-page address (/book/<slug>).
 * Slugs are globally unique, so report conflicts back instead of failing silently —
 * changing this breaks any link already shared with clients.
 */
export async function updateBookingSlug(_prev: SlugState, formData: FormData): Promise<SlugState> {
  const s = await requireSession();
  const slug = slugify(String(formData.get("slug") || ""));
  if (slug.length < 3) return { error: "invalid" };
  const clash = await db.org.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== s.orgId) return { error: "taken" };
  await db.org.update({ where: { id: s.orgId }, data: { slug } });
  revalidatePath("/", "layout");
  return { ok: slug };
}

export async function addBranch(formData: FormData) {
  const s = await requireSession();
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  if (!name) return;
  await db.branch.create({ data: { orgId: s.orgId, name } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function renameBranch(formData: FormData) {
  const s = await requireSession();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  if (!id || !name) return;
  await db.branch.update({ where: { id, orgId: s.orgId }, data: { name } });
  // Keep the session's branchName fresh if the active branch was renamed.
  if (id === s.branchId) await createSession({ ...s, branchName: name });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
