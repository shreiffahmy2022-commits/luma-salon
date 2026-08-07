import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator, type Locale } from "@/lib/i18n";
import { addDays, dateLabel, fmtMoney, minToStr, todayISO } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const s = await requireSession();
  const locale = getLocale();
  const tt = translator(locale);
  const isAr = locale === "ar";
  const today = todayISO();
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const prev7 = Array.from({ length: 7 }, (_, i) => addDays(today, -7 - i));
  const month = today.slice(0, 7);

  const [apptsToday, salesToday, sales14, monthItems, monthSalesCount] = await Promise.all([
    db.appointment.findMany({
      where: { orgId: s.orgId, branchId: s.branchId, date: today, status: { not: "CANCELLED" } },
      include: { customer: true, service: true, staff: true },
      orderBy: { startMin: "asc" },
    }),
    db.sale.aggregate({ where: { orgId: s.orgId, branchId: s.branchId, date: today }, _sum: { total: true }, _count: true }),
    db.sale.findMany({ where: { orgId: s.orgId, branchId: s.branchId, date: { in: [...last7, ...prev7] } }, select: { date: true, total: true } }),
    db.saleItem.findMany({
      where: { kind: "SERVICE", sale: { orgId: s.orgId, branchId: s.branchId, date: { startsWith: month } } },
      select: { name: true, unitPrice: true, qty: true },
    }),
    db.sale.count({ where: { orgId: s.orgId, branchId: s.branchId, date: { startsWith: month } } }),
  ]);

  const revOn = (d: string) => sales14.filter((x) => x.date === d).reduce((a, x) => a + x.total, 0);
  const rev7 = last7.reduce((a, d) => a + revOn(d), 0);
  const revPrev7 = prev7.reduce((a, d) => a + revOn(d), 0);
  const delta = revPrev7 ? Math.round(((rev7 - revPrev7) / revPrev7) * 100) : 0;
  const monthTotal = monthItems.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const avgTicket = monthSalesCount ? Math.round(monthTotal / monthSalesCount) : 0;

  const top = Object.entries(
    monthItems.reduce<Record<string, { n: number; v: number }>>((acc, i) => {
      acc[i.name] = acc[i.name] || { n: 0, v: 0 };
      acc[i.name].n += i.qty;
      acc[i.name].v += i.unitPrice * i.qty;
      return acc;
    }, {})
  ).sort((a, b) => b[1].v - a[1].v).slice(0, 5);

  const bars = [...last7].reverse();
  const maxR = Math.max(1, ...bars.map(revOn));
  const upcoming = apptsToday.filter((a) => a.status !== "COMPLETED").slice(0, 6);
  const cur = s.currency;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{tt("dash.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{s.orgName} · {s.branchName} · {dateLabel(today)}</p>
      <div className="grid gap-4 md:grid-cols-4 mb-5">
        <div className="card p-4"><div className="text-xs font-semibold text-[#7a7590]">{tt("dash.todayRevenue")}</div><div className="text-2xl font-extrabold mt-1">{fmtMoney(salesToday._sum.total || 0, cur)}</div><div className="text-xs text-[#7a7590] mt-1">{salesToday._count} {tt("dash.transactions")}</div></div>
        <div className="card p-4"><div className="text-xs font-semibold text-[#7a7590]">{tt("dash.apptsToday")}</div><div className="text-2xl font-extrabold mt-1">{apptsToday.length}</div><div className="text-xs text-[#7a7590] mt-1">{apptsToday.filter((a) => a.status === "COMPLETED").length} done · {upcoming.length} upcoming</div></div>
        <div className="card p-4"><div className="text-xs font-semibold text-[#7a7590]">{tt("dash.last7")}</div><div className="text-2xl font-extrabold mt-1">{fmtMoney(rev7, cur)}</div><div className={`text-xs font-semibold mt-1 ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs prior week</div></div>
        <div className="card p-4"><div className="text-xs font-semibold text-[#7a7590]">{tt("dash.avgTicket")}</div><div className="text-2xl font-extrabold mt-1">{fmtMoney(avgTicket, cur)}</div><div className="text-xs text-[#7a7590] mt-1">{monthSalesCount} sales this month</div></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] mb-5">
        <div className="card p-5">
          <b className="text-sm">{tt("dash.revenue7")}</b>
          <div className="flex items-end gap-2 h-40 mt-4">
            {bars.map((d) => (
              <div key={d} className="flex-1 flex flex-col items-center gap-1.5 text-[10px] text-[#7a7590]">
                <div className="flex-1 w-full max-w-[38px] flex items-end">
                  <div className={`w-full rounded-t-md ${d === today ? "bg-teal-500" : "bg-brand"}`} style={{ height: `${Math.round((revOn(d) / maxR) * 100)}%`, minHeight: 3 }} />
                </div>
                {new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <b className="text-sm">{tt("dash.topServices")}</b>
          <div className="mt-2">
            {top.length ? top.map(([n, x]) => (
              <div key={n} className="flex justify-between py-2 border-b border-dashed border-[#e9e6f2] text-sm last:border-0">
                <span>{n} <span className="text-[#7a7590] text-xs">×{x.n}</span></span><b>{fmtMoney(x.v, cur)}</b>
              </div>
            )) : <p className="text-sm text-[#7a7590] mt-2">{tt("dash.noSales")}</p>}
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-[#e9e6f2]">
          <b className="text-sm">{tt("dash.nextUp")}</b>
          <Link href="/calendar" className="btn-soft ms-auto !py-1.5 !px-3 text-xs">{tt("dash.openCalendar")}</Link>
        </div>
        {upcoming.length ? (
          <table className="w-full">
            <thead><tr><th className="th">Time</th><th className="th">Client</th><th className="th">Service</th><th className="th">Staff</th><th className="th">Status</th></tr></thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id} className="hover:bg-[#faf9fe]">
                  <td className="td font-bold">{minToStr(a.startMin)}</td>
                  <td className="td">{a.customer?.name || "Walk-in"}</td>
                  <td className="td">{isAr && a.service.nameAr ? a.service.nameAr : a.service.name}</td>
                  <td className="td">{a.staff.name}</td>
                  <td className="td"><span className="chip bg-brand-soft text-brand">{a.status.toLowerCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-[#7a7590] p-6 text-center">{tt("dash.noMore")}</p>}
      </div>
    </div>
  );
}
