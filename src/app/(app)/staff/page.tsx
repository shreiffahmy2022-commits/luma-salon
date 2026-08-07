import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { fmtMoney, initials, todayISO } from "@/lib/util";
import { deactivateStaff, upsertStaff } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const s = await requireSession();
  const tt = translator(getLocale());
  const month = todayISO().slice(0, 7);
  const [staff, items, bookings] = await Promise.all([
    db.staff.findMany({ where: { orgId: s.orgId, branchId: s.branchId, active: true }, orderBy: { name: "asc" } }),
    db.saleItem.findMany({ where: { sale: { orgId: s.orgId, branchId: s.branchId, date: { startsWith: month } }, staffId: { not: null } }, select: { staffId: true, unitPrice: true, qty: true } }),
    db.appointment.groupBy({ by: ["staffId"], where: { orgId: s.orgId, branchId: s.branchId, date: { startsWith: month }, status: { not: "CANCELLED" } }, _count: true }),
  ]);
  const revBy = (id: string) => items.filter((i) => i.staffId === id).reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const bkBy = (id: string) => bookings.find((b) => b.staffId === id)?._count ?? 0;
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-1">{tt("staff.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{tt("staff.subtitle")}</p>
      <details className="card p-5 mb-5">
        <summary className="cursor-pointer font-semibold text-sm text-brand">＋ {tt("staff.add")}</summary>
        <form action={upsertStaff} className="grid md:grid-cols-2 gap-x-4 mt-2">
          <div><label className="lbl">{tt("staff.fullName")}</label><input className="inp" name="name" required /></div>
          <div><label className="lbl">{tt("staff.role")}</label><input className="inp" name="title" placeholder="Hair Stylist" /></div>
          <div><label className="lbl">{tt("staff.phone")}</label><input className="inp" name="phone" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">{tt("staff.baseSalary")} ({s.currency})</label><input className="inp" name="baseSalary" type="number" defaultValue={3000} /></div>
            <div><label className="lbl">{tt("staff.commission")}</label><input className="inp" name="commissionPct" type="number" defaultValue={15} /></div>
          </div>
          <div className="md:col-span-2 mt-3"><button className="btn-primary">{tt("staff.save")}</button></div>
        </form>
      </details>
      <div className="grid gap-4 md:grid-cols-2">
        {staff.map((st) => (
          <div key={st.id} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full grid place-items-center text-white font-bold" style={{ background: st.color }}>{initials(st.name)}</div>
              <div><b>{st.name}</b><div className="text-xs text-[#7a7590]">{st.title || "Staff"}</div></div>
              <details className="ms-auto relative">
                <summary className="btn-soft !py-1 !px-3 text-xs cursor-pointer list-none inline-flex">{tt("staff.edit")}</summary>
                <div className="absolute end-0 z-10 card p-4 mt-1 w-72 shadow-xl">
                  <form action={upsertStaff}>
                    <input type="hidden" name="id" value={st.id} />
                    <label className="lbl">{tt("staff.fullName")}</label><input className="inp" name="name" defaultValue={st.name} />
                    <label className="lbl">{tt("staff.role")}</label><input className="inp" name="title" defaultValue={st.title} />
                    <label className="lbl">{tt("staff.phone")}</label><input className="inp" name="phone" defaultValue={st.phone} />
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="lbl">{tt("staff.baseSalary")}</label><input className="inp" name="baseSalary" type="number" defaultValue={st.baseSalary} /></div>
                      <div><label className="lbl">{tt("staff.commission")}</label><input className="inp" name="commissionPct" type="number" defaultValue={st.commissionPct} /></div>
                    </div>
                    <div className="flex gap-2 mt-3"><button className="btn-primary !py-1.5 text-xs">{tt("cust.saveShort")}</button><button formAction={deactivateStaff.bind(null, st.id)} className="btn-danger !py-1.5 text-xs">{tt("staff.deactivate")}</button></div>
                  </form>
                </div>
              </details>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div><div className="text-xs text-[#7a7590]">{tt("pay.commission")}</div><b>{st.commissionPct}%</b></div>
              <div><div className="text-xs text-[#7a7590]">{tt("staff.baseSalary")}</div><b>{fmtMoney(st.baseSalary, s.currency)}</b></div>
              <div><div className="text-xs text-[#7a7590]">{tt("staff.bookingsMo")}</div><b>{bkBy(st.id)}</b></div>
              <div><div className="text-xs text-[#7a7590]">{tt("staff.revenueMo")}</div><b>{fmtMoney(revBy(st.id), s.currency)}</b></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
