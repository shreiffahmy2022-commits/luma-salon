"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, requireSession } from "@/lib/session";

export async function switchBranch(branchId: string) {
  const s = await requireSession();
  if (branchId === s.branchId) return;
  const branch = await db.branch.findFirst({ where: { id: branchId, orgId: s.orgId } });
  if (!branch) return;
  await createSession({ ...s, branchId: branch.id, branchName: branch.name });
  revalidatePath("/", "layout");
}
