import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { todayISO } from "@/lib/util";
import CalendarClient from "./ui";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: { date?: string } }) {
  const s = await requireSession();
  const locale = getLocale();
  const tt = translator(locale);
  const isAr = locale === "ar";
  const labels = {
    title: tt("cal.title"), today: tt("cal.today"), clickSlot: tt("cal.clickSlot"),
    newBooking: tt("cal.newBooking"), editBooking: tt("cal.editBooking"),
    client: tt("cal.client"), walkin: tt("cal.walkin"), service: tt("cal.service"),
    staff: tt("cal.staff"), time: tt("cal.time"), status: tt("cal.status"),
    notes: tt("cal.notes"), optional: tt("cal.optional"), bookAnyway: tt("cal.bookAnyway"),
    delete: tt("cal.delete"), cancel: tt("cal.cancel"), saveChanges: tt("cal.saveChanges"),
    book: tt("cal.book"), saving: tt("cal.saving"),
    st_BOOKED: tt("status.booked"), st_CONFIRMED: tt("status.confirmed"),
    st_COMPLETED: tt("status.completed"), st_CANCELLED: tt("status.cancelled"), st_NOSHOW: tt("status.noshow"),
  };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date || "") ? searchParams.date! : todayISO();
  const [staff, rawAppts, rawServices, customers] = await Promise.all([
    db.staff.findMany({ where: { orgId: s.orgId, branchId: s.branchId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    db.appointment.findMany({
      where: { orgId: s.orgId, branchId: s.branchId, date },
      select: { id: true, date: true, startMin: true, durationMin: true, staffId: true, serviceId: true, customerId: true, status: true, notes: true, service: { select: { name: true, nameAr: true } }, customer: { select: { name: true } } },
    }),
    db.service.findMany({ where: { orgId: s.orgId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nameAr: true, durationMin: true, price: true } }),
    db.customer.findMany({ where: { orgId: s.orgId }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
  ]);
  const services = rawServices.map((sv) => ({ id: sv.id, name: isAr && sv.nameAr ? sv.nameAr : sv.name, durationMin: sv.durationMin, price: sv.price }));
  const appts = rawAppts.map((a) => ({ ...a, service: { name: isAr && a.service.nameAr ? a.service.nameAr : a.service.name } }));
  return <CalendarClient date={date} staff={staff} appts={appts} services={services} customers={customers} currency={s.currency} labels={labels} />;
}
