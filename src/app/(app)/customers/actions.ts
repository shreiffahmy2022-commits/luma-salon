"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function upsertCustomer(formData: FormData) {
  const s = await requireSession();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    tag: String(formData.get("tag") || ""),
    notes: String(formData.get("notes") || "").trim(),
  };
  if (!data.name) return;
  if (id) await db.customer.update({ where: { id, orgId: s.orgId }, data });
  else await db.customer.create({ data: { ...data, orgId: s.orgId } });
  revalidatePath("/customers");
}

export async function deleteCustomer(id: string) {
  const s = await requireSession();
  await db.customer.delete({ where: { id, orgId: s.orgId } });
  revalidatePath("/customers");
}
