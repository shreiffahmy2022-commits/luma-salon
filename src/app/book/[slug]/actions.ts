"use server";

import { db } from "@/lib/db";
import { freeSlots } from "@/lib/availability";
import { todayISO } from "@/lib/util";

export async function getSlots(slug: string, date: string, serviceId: string, staffId: string | null, branchId?: string):
  Promise<{ slots: { startMin: number; staffId: string }[]; error?: string }> {
  const org = await db.org.findUnique({ where: { slug } });
  const service = org && (await db.service.findFirst({ where: { orgId: org.id, id: serviceId, active: true } }));
  if (!org || !service || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { slots: [], error: "Invalid request" };
  const branch = branchId
    ? await db.branch.findFirst({ where: { id: branchId, orgId: org.id } })
    : await db.branch.findFirst({ where: { orgId: org.id }, orderBy: { id: "asc" } });
  if (!branch) return { slots: [], error: "Invalid branch" };
  const [staff, appts] = await Promise.all([
    db.staff.findMany({ where: { orgId: org.id, branchId: branch.id, active: true }, select: { id: true } }),
    db.appointment.findMany({
      where: { orgId: org.id, branchId: branch.id, date, status: { notIn: ["CANCELLED", "NOSHOW"] } },
      select: { staffId: true, startMin: true, durationMin: true },
    }),
  ]);
  const now = new Date();
  const minStart = date === todayISO() ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
  return { slots: freeSlots(appts, staff.map((x) => x.id), service.durationMin, staffId, minStart) };
}

export type BookInput = {
  slug: string; date: string; startMin: number; staffId: string; serviceId: string;
  branchId?: string; name: string; phone: string; email: string; notes: string;
};

export async function createOnlineBooking(input: BookInput): Promise<{ ref?: string; error?: string }> {
  const org = await db.org.findUnique({ where: { slug: input.slug } });
  const service = org && (await db.service.findFirst({ where: { orgId: org.id, id: input.serviceId, active: true } }));
  if (!org || !service) return { error: "Salon not found" };
  if (!input.name.trim() || !input.phone.trim()) return { error: "Name and phone are required" };

  const branch = input.branchId
    ? await db.branch.findFirst({ where: { id: input.branchId, orgId: org.id } })
    : await db.branch.findFirst({ where: { orgId: org.id }, orderBy: { id: "asc" } });
  if (!branch) return { error: "Salon not found" };
  // Guard: the chosen professional must belong to the chosen branch.
  const staffOk = await db.staff.findFirst({ where: { id: input.staffId, orgId: org.id, branchId: branch.id, active: true } });
  if (!staffOk) return { error: "That professional isn't available at this location — please pick another slot." };
  const busy = await db.appointment.findMany({
    where: { orgId: org.id, branchId: branch.id, date: input.date, staffId: input.staffId, status: { notIn: ["CANCELLED", "NOSHOW"] } },
    select: { staffId: true, startMin: true, durationMin: true },
  });
  const clash = busy.some((b) => input.startMin < b.startMin + b.durationMin && b.startMin < input.startMin + service.durationMin);
  if (clash) return { error: "Sorry, that time was just taken — please pick another slot." };

  const phoneKey = input.phone.replace(/\s/g, "");
  let customer = (await db.customer.findMany({ where: { orgId: org.id }, select: { id: true, phone: true } }))
    .find((c) => c.phone.replace(/\s/g, "") === phoneKey);
  const customerId = customer
    ? customer.id
    : (await db.customer.create({
        data: { orgId: org.id, name: input.name.trim(), phone: input.phone.trim(), email: input.email.trim(), tag: "new" },
      })).id;

  const appt = await db.appointment.create({
    data: {
      orgId: org.id, branchId: branch.id, staffId: input.staffId, serviceId: service.id, customerId,
      date: input.date, startMin: input.startMin, durationMin: service.durationMin,
      status: "BOOKED", source: "ONLINE", notes: (input.notes ? input.notes + " " : "") + "(online booking)",
    },
  });
  return { ref: appt.id.slice(-6).toUpperCase() };
}
