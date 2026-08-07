"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addDays, dateLabel, minToStr, todayISO, initials } from "@/lib/util";
import { deleteAppointment, saveAppointment } from "./actions";
import type { ApptStatus } from "@prisma/client";

const OPEN = 600, CLOSE = 1260, STEP = 30, SLOT_H = 28, HEAD_H = 44;

type Staff = { id: string; name: string; color: string };
type Appt = { id: string; startMin: number; durationMin: number; staffId: string; serviceId: string; customerId: string | null; status: string; notes: string; service: { name: string }; customer: { name: string } | null };
type Svc = { id: string; name: string; durationMin: number; price: number };
type Cust = { id: string; name: string };
type Labels = Record<string, string>;

const STATUSES = ["BOOKED", "CONFIRMED", "COMPLETED", "CANCELLED", "NOSHOW"] as const;

export default function CalendarClient(props: { date: string; staff: Staff[]; appts: Appt[]; services: Svc[]; customers: Cust[]; currency: string; labels: Labels }) {
  const { date, staff, appts, services, customers, labels: L } = props;
  const router = useRouter();
  const [modal, setModal] = useState<null | { appt?: Appt; staffId: string; startMin: number }>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const nav = (d: string) => router.push(`/calendar?date=${d}`);
  const openNew = (staffId: string, startMin: number) => { setErr(""); setModal({ staffId, startMin }); };
  const openEdit = (a: Appt) => { setErr(""); setModal({ appt: a, staffId: a.staffId, startMin: a.startMin }); };

  const submit = (form: FormData, force = false) => {
    start(async () => {
      const res = await saveAppointment({
        id: modal?.appt?.id,
        date: String(form.get("date")),
        startMin: Number(form.get("startMin")),
        staffId: String(form.get("staffId")),
        serviceId: String(form.get("serviceId")),
        customerId: String(form.get("customerId")),
        status: String(form.get("status")) as ApptStatus,
        notes: String(form.get("notes") || ""),
        force,
      });
      if (res.conflict) setErr(res.conflict);
      else if (res.error) setErr(res.error);
      else { setModal(null); router.refresh(); }
    });
  };

  const times: number[] = [];
  for (let m = OPEN; m < CLOSE; m += 60) times.push(m);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-bold">{L.title}</h1>
        <div className="flex items-center gap-2 ms-2">
          <button className="btn-ghost !px-3 !py-1.5" onClick={() => nav(addDays(date, -1))}>‹</button>
          <b className="min-w-44 text-center text-sm">{dateLabel(date)}{date === todayISO() && <span className="chip bg-teal-50 text-teal-600 ms-2">{L.today}</span>}</b>
          <button className="btn-ghost !px-3 !py-1.5" onClick={() => nav(addDays(date, 1))}>›</button>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => nav(todayISO())}>{L.today}</button>
        </div>
        <span className="text-xs text-[#7a7590] ms-auto">{L.clickSlot}</span>
        <button className="btn-primary" onClick={() => openNew(staff[0]?.id ?? "", 660)}>＋ {L.newBooking}</button>
      </div>

      <div className="card flex overflow-auto" style={{ maxHeight: "calc(100vh - 150px)" }}>
        <div className="w-14 shrink-0 border-r border-[#e9e6f2]" style={{ paddingTop: HEAD_H }}>
          {times.map((m) => <div key={m} className="h-14 text-[10px] text-[#7a7590] text-right pr-2 -translate-y-1.5">{minToStr(m)}</div>)}
        </div>
        {staff.map((st) => (
          <div key={st.id} className="flex-1 min-w-40 border-r border-[#e9e6f2] last:border-0 relative">
            <div className="sticky top-0 z-10 bg-white h-11 flex items-center justify-center gap-2 border-b border-[#e9e6f2] text-sm font-bold">
              <span className="w-6 h-6 rounded-full grid place-items-center text-white text-[10px]" style={{ background: st.color }}>{initials(st.name)}</span>
              {st.name.split(" ")[0]}
            </div>
            {Array.from({ length: (CLOSE - OPEN) / STEP }, (_, i) => (
              <div key={i} className="h-7 border-b border-dashed border-[#f0eef7] cursor-pointer hover:bg-brand-soft" onClick={() => openNew(st.id, OPEN + i * STEP)} />
            ))}
            {appts.filter((a) => a.staffId === st.id).map((a) => (
              <div key={a.id}
                className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-white text-[11px] overflow-hidden cursor-pointer shadow ${["CANCELLED", "NOSHOW"].includes(a.status) ? "opacity-40 line-through" : ""}`}
                style={{ top: HEAD_H + ((a.startMin - OPEN) / STEP) * SLOT_H, height: Math.max(26, (a.durationMin / STEP) * SLOT_H - 3), background: st.color }}
                onClick={() => openEdit(a)}>
                <b className="block truncate">{a.customer?.name || L.walkin}</b>
                <span className="opacity-85 text-[10px]">{minToStr(a.startMin)} · {a.service.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-start justify-center overflow-auto py-10 px-4" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <form className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl" action={(fd) => submit(fd)}>
            <div className="flex items-center mb-3"><b className="text-base">{modal.appt ? L.editBooking : L.newBooking}</b>
              <button type="button" className="ms-auto text-[#7a7590]" onClick={() => setModal(null)}>✕</button></div>
            <input type="hidden" name="date" value={date} />
            <label className="lbl">{L.client}</label>
            <select className="inp" name="customerId" defaultValue={modal.appt?.customerId ?? customers[0]?.id ?? ""}>
              <option value="">{L.walkin}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">{L.service}</label>
                <select className="inp" name="serviceId" defaultValue={modal.appt?.serviceId ?? services[0]?.id}>
                  {services.map((sv) => <option key={sv.id} value={sv.id}>{sv.name} ({sv.durationMin}m)</option>)}
                </select></div>
              <div><label className="lbl">{L.staff}</label>
                <select className="inp" name="staffId" defaultValue={modal.staffId}>
                  {staff.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select></div>
              <div><label className="lbl">{L.time}</label>
                <select className="inp" name="startMin" defaultValue={modal.startMin}>
                  {Array.from({ length: (CLOSE - OPEN) / 15 }, (_, i) => OPEN + i * 15).map((m) => <option key={m} value={m}>{minToStr(m)}</option>)}
                </select></div>
              <div><label className="lbl">{L.status}</label>
                <select className="inp" name="status" defaultValue={modal.appt?.status ?? "BOOKED"}>
                  {STATUSES.map((x) => <option key={x} value={x}>{L[`st_${x}`]}</option>)}
                </select></div>
            </div>
            <label className="lbl">{L.notes}</label>
            <input className="inp" name="notes" defaultValue={modal.appt?.notes ?? ""} placeholder={L.optional} />
            {err && (
              <div className="mt-3 text-sm text-red-600">
                {err}{" "}
                <button type="button" className="underline font-semibold" onClick={(e) => submit(new FormData((e.target as HTMLElement).closest("form")!), true)}>{L.bookAnyway}</button>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              {modal.appt && (
                <button type="button" className="btn-danger" disabled={pending}
                  onClick={() => start(async () => { await deleteAppointment(modal.appt!.id); setModal(null); router.refresh(); })}>{L.delete}</button>
              )}
              <span className="flex-1" />
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>{L.cancel}</button>
              <button className="btn-primary" disabled={pending}>{pending ? L.saving : modal.appt ? L.saveChanges : L.book}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
