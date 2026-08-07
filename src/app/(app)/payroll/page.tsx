import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { fmtMoney, initials, monthLabel, pad, todayISO } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function PayrollPage({ searchParams }: { searchParams: { month?: string } }) {
  const s = await requireSession();
  const tt = translator(getLocale());
  const month = /^\d{4}-\d{2}$/.test(searchParams.month || "") ? searchParams.month! : todayISO().slice(0, 7);
  const [staff, items] = await Promise.all([
    db.staff.findMany({ where: { orgId: s.orgId, branchId: s.branchId, active: true }, orderBy: { name: "asc" } }),
    db.saleItem.findMany({ where: { sale: { orgId: s.orgId, branchId: s.branchId, date: { startsWith: month } }, staffId: { not: null } }, select: { staffId: true, unitPrice: true, qty: true } }),
  ]);
  const rows = staff.map((st) => {
    const rev = items.filter((i) => i.staffId === st.id).reduce((a, i) => a + i.unitPrice * i.qty, 0);
    const comm = Math.round((rev * st.commissionPct) / 100);
    return { st, rev, comm, total: st.baseSalary + comm };
  });
  const grand = rows.reduce((a, r) => a + r.total, 0);
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-1">{tt("pay.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{tt("pay.subtitle")}</p>
      <form className="mb-4">
        <select className="inp !w-56" name="month" defaultValue={month} onChange={undefined}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button className="btn-ghost ms-2">{tt("pay.view")}</button>
      </form>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr><th className="th">{tt("pay.staff")}</th><th className="th text-end">{tt("pay.servicesRevenue")}</th><th className="th text-end">{tt("pay.commission")}</th><th className="th text-end">{tt("pay.baseSalary")}</th><th className="th text-end">{tt("pay.totalPay")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.st.id} className="hover:bg-[#faf9fe]">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full grid place-items-center text-white text-xs font-bold" style={{ background: r.st.color }}>{initials(r.st.name)}</div>
                    <div><b>{r.st.name}</b><div className="text-xs text-[#7a7590]">{r.st.title} · {r.st.commissionPct}%</div></div>
                  </div>
                </td>
                <td className="td text-end">{fmtMoney(r.rev, s.currency)}</td>
                <td className="td text-end">{fmtMoney(r.comm, s.currency)}</td>
                <td className="td text-end">{fmtMoney(r.st.baseSalary, s.currency)}</td>
                <td className="td text-end font-bold">{fmtMoney(r.total, s.currency)}</td>
              </tr>
            ))}
            <tr><td className="td font-bold">{tt("pay.totalPayroll")} — {monthLabel(month)}</td><td className="td" colSpan={3}></td><td className="td text-end font-extrabold text-base">{fmtMoney(grand, s.currency)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
