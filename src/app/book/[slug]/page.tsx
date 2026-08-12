import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import BookingWizard from "./ui";
import AssistantWidget from "./assistant-widget";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params }: { params: { slug: string } }) {
  const org = await db.org.findUnique({ where: { slug: params.slug } });
  if (!org) notFound();
  const [branches, rawServices, staff] = await Promise.all([
    db.branch.findMany({ where: { orgId: org.id }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
    db.service.findMany({ where: { orgId: org.id, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, nameAr: true, category: true, durationMin: true, price: true } }),
    db.staff.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, title: true, color: true, branchId: true } }),
  ]);
  const services = rawServices.map((sv) => ({ id: sv.id, name: sv.name, nameAr: sv.nameAr, category: sv.category, durationMin: sv.durationMin, price: sv.price }));
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="bg-gradient-to-br from-[#2c2138] via-[#4b3560] to-[#5b3b6e] text-white text-center py-14 px-4">
        <div className="inline-block border border-white/30 rounded-full px-4 py-1 text-[11px] tracking-[2px] uppercase text-purple-100 mb-4">Beauty · Hair · Spa</div>
        <h1 className="text-4xl font-serif font-semibold">{org.name}</h1>
        <p className="text-purple-200 mt-2 text-sm">Book your next appointment online — no calls, no waiting.</p>
      </div>
      <BookingWizard slug={org.slug} orgName={org.name} currency={org.currency} branches={branches} services={services} staff={staff} />
      <AssistantWidget slug={org.slug} orgName={org.name} />
    </div>
  );
}
