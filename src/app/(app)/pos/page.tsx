import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, t, translator } from "@/lib/i18n";
import POSClient from "./ui";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const s = await requireSession();
  const locale = getLocale();
  const tt = translator(locale);
  const isAr = locale === "ar";
  const labels = {
    title: tt("pos.title"), subtitle: tt("pos.subtitle"), all: tt("pos.all"), retail: tt("pos.retail"),
    currentSale: tt("pos.currentSale"), clear: tt("pos.clear"), client: tt("pos.customer"), walkin: tt("pos.walkin"),
    tapItems: tt("pos.tapItems"), discount: tt("pos.discount"), payment: tt("pos.payment"), stock: tt("pos.stock"),
    subtotal: tt("pos.subtotal"), discountAmt: tt("pos.discountAmt"), total: tt("pos.total"),
    charging: tt("pos.charging"), charge: tt("pos.charge"), paid: tt("pos.paid"), totalPaid: tt("pos.totalPaid"),
    close: tt("pos.close"), print: tt("pos.print"),
  };
  const [rawServices, products, staff, customers] = await Promise.all([
    db.service.findMany({ where: { orgId: s.orgId, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, nameAr: true, category: true, durationMin: true, price: true } }),
    db.product.findMany({ where: { orgId: s.orgId }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true, stock: true } }),
    db.staff.findMany({ where: { orgId: s.orgId, branchId: s.branchId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.customer.findMany({ where: { orgId: s.orgId }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
  ]);
  const services = rawServices.map((sv) => ({
    id: sv.id, name: isAr && sv.nameAr ? sv.nameAr : sv.name,
    category: t(`cat.${sv.category}`, locale), durationMin: sv.durationMin, price: sv.price,
  }));
  return <POSClient services={services} products={products} staff={staff} customers={customers} currency={s.currency} labels={labels} />;
}
