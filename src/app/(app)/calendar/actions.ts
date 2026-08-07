"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { ApptStatus } from "@prisma/client";

export type SaveApptInput = {
  id?: string;
  date: string;
  startMin: number;
  staffId: string;
  serviceId: string;
  customerId: string;
  status: ApptStatus;
  notes: string;
  force?: boolean;
};

export async function saveAppointment(input: SaveApptInput): Promise<{ ok?: true; conflict?: string; error?: string }> {
  const s = await requireSession();
  const service = await db.service.findFirst({ where: { id: input.serviceId, orgId: s.orgId } });
  if (!service || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Invalid input" };

  if (!input.force && input.status !== "CANCELLED") {
    const clash = await db.appointment.findFirst({
      where: {
        orgId: s.orgId, branchId: s.branchId, date: input.date, staffId: input.staffId,
        status: { notIn: ["CANCELLED", "NOSHOW"] },
        ...(input.id ? { id: { not: input.id } } : {}),
        startMin: { lt: input.startMin + service.durationMin },
      },
      include: { staff: true },
    });
    if (clash && clash.startMin + clash.durationMin > input.startMin)
      return { conflict: `Overlaps another appointment for ${clash.staff.name}.` };
  }

  const data = {
    date: input.date, startMin: input.startMin, durationMin: service.durationMin,
    staffId: input.staffId, serviceId: input.serviceId,
    customerId: input.customerId || null, status: input.status, notes: input.notes.slice(0, 500),
  };
  if (input.id) await db.appointment.update({ where: { id: input.id, orgId: s.orgId }, data });
  else await db.appointment.create({ data: { ...data, orgId: s.orgId, branchId: s.branchId } });
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteAppointment(id: string) {
  const s = await requireSession();
  await db.appointment.delete({ where: { id, orgId: s.orgId } });
  revalidatePath("/calendar");
}

export async function completeAndCharge(id: string): Promise<{ ok: true } | { error: string }> {
  const s = await requireSession();
  const appt = await db.appointment.findFirst({ where: { id, orgId: s.orgId }, include: { service: true } });
  if (!appt) return { error: "Not found" };
  await db.appointment.update({ where: { id }, data: { status: "COMPLETED" } });
  revalidatePath("/calendar");
  return { ok: true };
}
