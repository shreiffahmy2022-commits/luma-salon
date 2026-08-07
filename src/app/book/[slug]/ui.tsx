"use client";

import { useState, useTransition } from "react";
import { addDays, fmtMoney, initials, minToStr, todayISO } from "@/lib/util";
import { createOnlineBooking, getSlots } from "./actions";

type Svc = { id: string; name: string; nameAr?: string; category: string; durationMin: number; price: number };
type Staff = { id: string; name: string; title: string; color: string; branchId: string };
type Branch = { id: string; name: string };
type Slot = { startMin: number; staffId: string };

export default function BookingWizard(props: { slug: string; orgName: string; currency: string; branches: Branch[]; services: Svc[]; staff: Staff[] }) {
  const { slug, currency, branches, services, staff } = props;
  const multiBranch = branches.length > 1;
  const [step, setStep] = useState(1);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [anyStaff, setAnyStaff] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const svc = services.find((s) => s.id === serviceId);
  const cats = [...new Set(services.map((s) => s.category))];
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayISO(), i));
  const branchStaff = staff.filter((s) => s.branchId === branchId);

  const loadSlots = (d: string, st: string | null) =>
    start(async () => {
      setSlots(null); setSlot(null);
      const res = await getSlots(slug, d, serviceId, st, branchId);
      setSlots(res.slots);
    });

  const confirm = () =>
    start(async () => {
      setErr("");
      const res = await createOnlineBooking({ slug, date, startMin: slot!.startMin, staffId: slot!.staffId, serviceId, branchId, ...form });
      if (res.error) setErr(res.error);
      else { setRef(res.ref!); setStep(5); }
    });

  return (
    <div className="max-w-xl mx-auto px-4 -mt-8 pb-16">
      <div className="bg-white rounded-2xl shadow-xl border border-[#eae4da] p-6">
        {step < 5 && (
          <div className="flex gap-1.5 mb-5">{[1, 2, 3, 4].map((i) => <div key={i} className={`flex-1 h-1 rounded-full ${step >= i ? "bg-[#5b3b6e]" : "bg-[#eae4da]"}`} />)}</div>
        )}

        {step === 1 && (
          <div>
            {multiBranch && (
              <div className="mb-5">
                <h2 className="font-serif text-xl mb-3">Choose a location</h2>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
                  {branches.map((b) => (
                    <button key={b.id} onClick={() => { setBranchId(b.id); setStaffId(null); setAnyStaff(false); }}
                      className={`border rounded-xl p-3 text-left font-semibold text-sm ${branchId === b.id ? "border-[#5b3b6e] bg-[#f2ecf6]" : "border-[#eae4da]"}`}>
                      📍 {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <h2 className="font-serif text-xl mb-4">Choose a service</h2>
            {cats.map((cat) => (
              <div key={cat}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#b9895a] mt-4 mb-2">{cat}</div>
                {services.filter((s) => s.category === cat).map((s) => (
                  <button key={s.id} onClick={() => { setServiceId(s.id); setStep(2); }}
                    className={`w-full flex items-center gap-3 border rounded-xl p-3.5 mb-2 text-left hover:border-[#5b3b6e] ${serviceId === s.id ? "border-[#5b3b6e] bg-[#f2ecf6]" : "border-[#eae4da]"}`}>
                    <span className="flex-1"><b className="text-sm block">{s.name}</b>{s.nameAr && <span className="text-xs text-[#8a8296] block" dir="rtl">{s.nameAr}</span>}<span className="text-xs text-[#8a8296]">{s.durationMin} min</span></span>
                    <b>{fmtMoney(s.price, currency)}</b>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {step === 2 && svc && (
          <div>
            <h2 className="font-serif text-xl mb-4">Choose your professional</h2>
            {multiBranch && (
              <div className="bg-[#f7efe6] rounded-xl px-4 py-2 text-xs text-[#7c5a37] mb-3">📍 {branches.find((b) => b.id === branchId)?.name}</div>
            )}
            <button onClick={() => { setStaffId(null); setAnyStaff(true); }}
              className={`w-full flex items-center gap-3 border rounded-xl p-3.5 mb-2 text-left ${anyStaff && !staffId ? "border-[#5b3b6e] bg-[#f2ecf6]" : "border-[#eae4da]"}`}>
              <span className="w-10 h-10 rounded-full grid place-items-center text-white bg-gradient-to-br from-[#5b3b6e] to-[#b9895a]">✦</span>
              <span><b className="text-sm block">Any professional</b><span className="text-xs text-[#8a8296]">First available — most times</span></span>
            </button>
            {branchStaff.map((st) => (
              <button key={st.id} onClick={() => { setStaffId(st.id); setAnyStaff(false); }}
                className={`w-full flex items-center gap-3 border rounded-xl p-3.5 mb-2 text-left ${staffId === st.id ? "border-[#5b3b6e] bg-[#f2ecf6]" : "border-[#eae4da]"}`}>
                <span className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-xs" style={{ background: st.color }}>{initials(st.name)}</span>
                <span><b className="text-sm block">{st.name}</b><span className="text-xs text-[#8a8296]">{st.title}</span></span>
              </button>
            ))}
            <div className="bg-[#f7efe6] rounded-xl px-4 py-2.5 text-sm text-[#7c5a37] mt-2">Booking: <b>{svc.name}</b> · {svc.durationMin} min · {fmtMoney(svc.price, currency)}</div>
            <Nav back={() => setStep(1)} next={() => { setStep(3); loadSlots(date, staffId); }} disabled={!anyStaff && !staffId} pending={pending} />
          </div>
        )}

        {step === 3 && svc && (
          <div>
            <h2 className="font-serif text-xl mb-4">Pick a date &amp; time</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const dt = new Date(d + "T12:00:00");
                return (
                  <button key={d} onClick={() => { setDate(d); loadSlots(d, staffId); }}
                    className={`shrink-0 w-16 border rounded-xl py-2 text-center ${date === d ? "border-[#5b3b6e] bg-[#f2ecf6]" : "border-[#eae4da]"}`}>
                    <div className="text-[10px] uppercase font-bold text-[#8a8296]">{dt.toLocaleDateString("en", { weekday: "short" })}</div>
                    <div className="font-serif text-lg font-bold">{dt.getDate()}</div>
                  </button>
                );
              })}
            </div>
            {slots === null && <p className="text-sm text-[#8a8296] text-center py-6">Loading times…</p>}
            {slots && !slots.length && <p className="text-sm text-[#8a8296] text-center py-6">No availability this day — try another date{staffId ? " or “Any professional”" : ""}.</p>}
            {slots && slots.length > 0 && (
              <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(86px,1fr))" }}>
                {slots.map((sl) => (
                  <button key={sl.startMin} onClick={() => setSlot(sl)}
                    className={`border rounded-lg py-2 text-[13px] font-semibold ${slot?.startMin === sl.startMin ? "bg-[#5b3b6e] text-white border-[#5b3b6e]" : "border-[#eae4da]"}`}>
                    {minToStr(sl.startMin)}
                  </button>
                ))}
              </div>
            )}
            {slot && <div className="bg-[#f7efe6] rounded-xl px-4 py-2.5 text-sm text-[#7c5a37] mt-3">✓ {minToStr(slot.startMin)} with <b>{staff.find((x) => x.id === slot.staffId)?.name}</b></div>}
            <Nav back={() => setStep(2)} next={() => setStep(4)} disabled={!slot} pending={pending} />
          </div>
        )}

        {step === 4 && svc && slot && (
          <div>
            <h2 className="font-serif text-xl mb-4">Your details</h2>
            <div className="text-sm border-b border-dashed border-[#eae4da] pb-2 mb-1 flex justify-between"><span>{svc.name} · {svc.durationMin} min</span><b>{fmtMoney(svc.price, currency)}</b></div>
            <div className="text-sm border-b border-dashed border-[#eae4da] pb-2 flex justify-between"><span>{date} · {minToStr(slot.startMin)}</span><span>{staff.find((x) => x.id === slot.staffId)?.name}</span></div>
            <label className="lbl">Full name *</label><input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="lbl">Phone (WhatsApp) *</label><input className="inp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+971 5x xxx xxxx" />
            <label className="lbl">Email</label><input className="inp" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="lbl">Notes</label><textarea className="inp" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            <Nav back={() => setStep(3)} next={confirm} disabled={!form.name.trim() || !form.phone.trim()} pending={pending} nextLabel="Confirm booking" />
          </div>
        )}

        {step === 5 && svc && slot && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-50 text-green-600 grid place-items-center text-3xl mb-4">✓</div>
            <h2 className="font-serif text-2xl">See you soon, {form.name.split(" ")[0]}!</h2>
            <p className="text-sm text-[#8a8296] mt-1">Your appointment is booked.</p>
            <div className="inline-block bg-[#f3eee7] rounded-full px-4 py-1.5 font-bold tracking-wider text-sm my-4">REF · {ref}</div>
            <div className="text-sm flex justify-between border-b border-dashed border-[#eae4da] py-2"><span>{svc.name}</span><b>{fmtMoney(svc.price, currency)}</b></div>
            <div className="text-sm flex justify-between py-2"><span>{date} · {minToStr(slot.startMin)}</span><span>{staff.find((x) => x.id === slot.staffId)?.name}</span></div>
            <div className="bg-[#f7efe6] rounded-xl px-4 py-2.5 text-sm text-[#7c5a37] mt-3 text-left">📱 A confirmation will be sent to <b>{form.phone}</b>. Free cancellation up to 2 hours before.</div>
            <button className="mt-5 bg-[#5b3b6e] text-white rounded-full px-6 py-2.5 font-bold text-sm" onClick={() => { setStep(1); setServiceId(""); setStaffId(null); setAnyStaff(false); setSlot(null); setSlots(null); setErr(""); }}>Book another</button>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-[#8a8296] mt-5">Powered by <b>Luma</b> · Salon SaaS</p>
    </div>
  );
}

function Nav(props: { back: () => void; next: () => void; disabled: boolean; pending: boolean; nextLabel?: string }) {
  return (
    <div className="flex gap-2 mt-5">
      <button onClick={props.back} className="bg-[#f3eee7] rounded-full px-5 py-2.5 font-bold text-sm">← Back</button>
      <span className="flex-1" />
      <button onClick={props.next} disabled={props.disabled || props.pending}
        className="bg-[#5b3b6e] text-white rounded-full px-6 py-2.5 font-bold text-sm disabled:opacity-40">
        {props.pending ? "…" : props.nextLabel || "Continue"}
      </button>
    </div>
  );
}
