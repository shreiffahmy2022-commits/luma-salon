"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { todayISO } from "@/lib/util";

export type CartLine = { kind: "SERVICE" | "PRODUCT"; refId: string; qty: number; staffId: string | null };
export type CheckoutInput = { lines: CartLine[]; customerId: string | null; discountPct: number; method: string };
export type Receipt = {
  id: string; total: number; discount: number; method: string; date: string;
  customer: string; items: { name: string; qty: number; unitPrice: number; staff: string }[];
};

export async function recordSale(input: CheckoutInput): Promise<{ receipt?: Receipt; error?: string }> {
  const s = await requireSession();
  if (!input.lines.length) return { error: "Cart is empty" };
  const [services, products, staff] = await Promise.all([
    db.service.findMany({ where: { orgId: s.orgId } }),
    db.product.findMany({ where: { orgId: s.orgId } }),
    db.staff.findMany({ where: { orgId: s.orgId } }),
  ]);
  const items = input.lines.map((l) => {
    const src = l.kind === "SERVICE" ? services.find((x) => x.id === l.refId) : products.find((x) => x.id === l.refId);
    if (!src) throw new Error("Unknown item");
    return { kind: l.kind, name: src.name, unitPrice: src.price, qty: Math.max(1, l.qty), staffId: l.staffId };
  });
  const sub = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const discount = Math.min(sub, Math.round((sub * Math.min(100, Math.max(0, input.discountPct))) / 100));

  const sale = await db.sale.create({
    data: {
      orgId: s.orgId, branchId: s.branchId, customerId: input.customerId || null,
      date: todayISO(), method: input.method, discount, total: sub - discount,
      items: { create: items },
    },
    include: { customer: true },
  });
  for (const l of input.lines)
    if (l.kind === "PRODUCT")
      await db.product.updateMany({ where: { id: l.refId, orgId: s.orgId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });

  revalidatePath("/pos"); revalidatePath("/sales"); revalidatePath("/dashboard");
  return {
    receipt: {
      id: sale.id.slice(-6).toUpperCase(), total: sale.total, discount, method: sale.method, date: sale.date,
      customer: sale.customer?.name || "Walk-in",
      items: items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice, staff: staff.find((x) => x.id === i.staffId)?.name.split(" ")[0] || "—" })),
    },
  };
}
