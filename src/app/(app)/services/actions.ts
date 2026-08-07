"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function upsertService(formData: FormData) {
  const s = await requireSession();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name") || "").trim(),
    nameAr: String(formData.get("nameAr") || "").trim(),
    category: String(formData.get("category") || "General").trim() || "General",
    durationMin: Math.max(15, Number(formData.get("durationMin")) || 60),
    price: Math.max(0, Number(formData.get("price")) || 0),
  };
  if (!data.name) return;
  if (id) await db.service.update({ where: { id, orgId: s.orgId }, data });
  else await db.service.create({ data: { ...data, orgId: s.orgId } });
  revalidatePath("/services");
}

export async function deleteService(id: string) {
  const s = await requireSession();
  await db.service.update({ where: { id, orgId: s.orgId }, data: { active: false } });
  revalidatePath("/services");
}
