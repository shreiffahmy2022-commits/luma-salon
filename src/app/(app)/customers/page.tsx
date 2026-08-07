import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { dateLabel, fmtMoney, initials } from "@/lib/util";
import { deleteCustomer, upsertCustomer } from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const s = await requireSession();
  const tt = translator(getLocale());
  const q = (searchParams.q || "").trim();
  const [customers, spendRows] = await Promise.all([
    db.customer.findMany({
      where: { orgId: s.orgId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
      include: { _count: { select: { appointments: { where: { status: "COMPLETED" } } } }, appointments: { where: { status: "COMPLETED" }, orderBy: { date: "desc" }, take: 1, select: { date: true } } },
      orderBy: { name: "asc" },
      take: 200,
    }),
    db.sale.groupBy({ by: ["customerId"], where: { orgId: s.orgId, customerId: { not: null } }, _sum: { total: true } }),
  ]);
  const spendBy = (id: string) => spendRows.find((r) => r.customerId === id)?._sum.total ?? 0;
  const COLORS = ["#6d4aff", "#0fb5a6", "#f59e0b", "#e5484d", "#2f80ed", "#9b51e0"];
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-1">{tt("cust.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{tt("cust.subtitle")}</p>
      <div className="flex items-center gap-3 mb-4">
        <form className="flex gap-2">
          <input className="inp !w-64" name="q" defaultValue={q} placeholder={tt("cust.search")} />
          <button className="btn-ghost">{tt("cust.searchBtn")}</button>
        </form>
      </div>
      <details className="card p-5 mb-5">
        <summary className="cursor-pointer font-semibold text-sm text-brand">＋ {tt("cust.add")}</summary>
        <form action={upsertCustomer} className="grid md:grid-cols-2 gap-x-4 mt-2">
          <div><label className="lbl">{tt("cust.fullName")}</label><input className="inp" name="name" required /></div>
          <div><label className="lbl">{tt("cust.phone")}</label><input className="inp" name="phone" /></div>
          <div><label className="lbl">{tt("cust.email")}</label><input className="inp" name="email" /></div>
          <div><label className="lbl">{tt("cust.tag")}</label><select className="inp" name="tag"><option value="">{tt("cust.none")}</option><option value="vip">VIP</option><option value="new">New</option></select></div>
          <div className="md:col-span-2"><label className="lbl">{tt("cust.notes")}</label><input className="inp" name="notes" /></div>
          <div className="md:col-span-2 mt-3"><button className="btn-primary">{tt("cust.save")}</button></div>
        </form>
      </details>
      <div className="card overflow-visible">
        <table className="w-full">
          <thead><tr><th className="th">{tt("cust.client")}</th><th className="th">{tt("cust.phone")}</th><th className="th">{tt("cust.visits")}</th><th className="th">{tt("cust.lifetime")}</th><th className="th">{tt("cust.lastVisit")}</th><th className="th"></th></tr></thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={c.id} className="hover:bg-[#faf9fe]">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full grid place-items-center text-white text-xs font-bold shrink-0" style={{ background: COLORS[i % 6] }}>{initials(c.name)}</div>
                    <div><b>{c.name}</b>{c.tag && <span className={`chip ml-2 ${c.tag === "vip" ? "bg-amber-100 text-amber-600" : "bg-teal-50 text-teal-600"}`}>{c.tag.toUpperCase()}</span>}<div className="text-xs text-[#7a7590]">{c.email}</div></div>
                  </div>
                </td>
                <td className="td">{c.phone}</td>
                <td className="td">{c._count.appointments}</td>
                <td className="td font-bold">{fmtMoney(spendBy(c.id), s.currency)}</td>
                <td className="td">{c.appointments[0] ? dateLabel(c.appointments[0].date) : "—"}</td>
                <td className="td text-end w-40">
                  <details className="inline-block relative text-start">
                    <summary className="btn-soft !py-1 !px-3 text-xs cursor-pointer list-none inline-flex">{tt("cust.edit")}</summary>
                    <div className="absolute end-0 z-10 card p-4 mt-1 w-72 shadow-xl">
                      <form action={upsertCustomer}>
                        <input type="hidden" name="id" value={c.id} />
                        <label className="lbl">{tt("cust.fullName")}</label><input className="inp" name="name" defaultValue={c.name} />
                        <label className="lbl">{tt("cust.phone")}</label><input className="inp" name="phone" defaultValue={c.phone} />
                        <label className="lbl">{tt("cust.email")}</label><input className="inp" name="email" defaultValue={c.email} />
                        <label className="lbl">{tt("cust.tag")}</label>
                        <select className="inp" name="tag" defaultValue={c.tag}><option value="">{tt("cust.none")}</option><option value="vip">VIP</option><option value="new">New</option></select>
                        <label className="lbl">{tt("cust.notes")}</label><input className="inp" name="notes" defaultValue={c.notes} />
                        <div className="flex gap-2 mt-3"><button className="btn-primary !py-1.5 text-xs">{tt("cust.saveShort")}</button><button formAction={deleteCustomer.bind(null, c.id)} className="btn-danger !py-1.5 text-xs">{tt("cust.delete")}</button></div>
                      </form>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {!customers.length && <tr><td className="td text-center text-[#7a7590] py-8" colSpan={6}>{tt("cust.empty")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
