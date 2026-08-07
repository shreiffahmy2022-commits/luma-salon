"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

const COLORS = ["#6d4aff", "#0fb5a6", "#f59e0b", "#e5484d", "#2f80ed", "#9b51e0"];

export async function upsertStaff(formData: FormData) {
  const s = await requireSession();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    baseSalary: Math.max(0, Number(formData.get("baseSalary")) || 0),
    commissionPct: Math.min(100, Math.max(0, Number(formData.get("commissionPct")) || 0)),
  };
  if (!data.name) return;
  if (id) await db.staff.update({ where: { id, orgId: s.orgId }, data });
  else {
    const count = await db.staff.count({ where: { orgId: s.orgId } });
    await db.staff.create({ data: { ...data, orgId: s.orgId, branchId: s.branchId, color: COLORS[count % COLORS.length] } });
  }
  revalidatePath("/staff");
}

export async function deactivateStaff(id: string) {
  const s = await requireSession();
  const active = await db.staff.count({ where: { orgId: s.orgId, active: true } });
  if (active <= 1) return;
  await db.staff.update({ where: { id, orgId: s.orgId }, data: { active: false } });
  revalidatePath("/staff");
}
