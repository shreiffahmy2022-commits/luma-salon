import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { dateLabel, fmtMoney, todayISO } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const s = await requireSession();
  const tt = translator(getLocale());
  const [sales, todayAgg] = await Promise.all([
    db.sale.findMany({
      where: { orgId: s.orgId, branchId: s.branchId },
      include: { customer: { select: { name: true } }, items: { select: { name: true } } },
      orderBy: { at: "desc" }, take: 120,
    }),
    db.sale.aggregate({ where: { orgId: s.orgId, branchId: s.branchId, date: todayISO() }, _sum: { total: true } }),
  ]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-1">{tt("sales.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{tt("sales.allTx")} · {tt("sales.today")}: <b className="text-[#1c1830]">{fmtMoney(todayAgg._sum.total || 0, s.currency)}</b></p>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr><th className="th">{tt("sales.date")}</th><th className="th">{tt("sales.client")}</th><th className="th">{tt("sales.items")}</th><th className="th">{tt("sales.method")}</th><th className="th text-end">{tt("sales.total")}</th></tr></thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-[#faf9fe]">
                <td className="td whitespace-nowrap">{dateLabel(sale.date)} <span className="text-xs text-[#7a7590]">{sale.at.toISOString().slice(11, 16)}</span></td>
                <td className="td">{sale.customer?.name || "Walk-in"}</td>
                <td className="td text-[#4a4460]">{sale.items.map((i) => i.name).join(", ")}</td>
                <td className="td"><span className="chip bg-[#eeedf3] text-[#7a7590]">{sale.method}</span></td>
                <td className="td text-end font-bold">{fmtMoney(sale.total, s.currency)}</td>
              </tr>
            ))}
            {!sales.length && <tr><td colSpan={5} className="td text-center text-[#7a7590] py-8">{tt("sales.empty")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
