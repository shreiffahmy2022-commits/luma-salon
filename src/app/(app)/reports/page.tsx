import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { addDays, dateLabel, fmtMoney, initials, todayISO } from "@/lib/util";

export const dynamic = "force-dynamic";

const PRESETS: [string, number][] = [
  ["7 days", 7],
  ["30 days", 30],
  ["90 days", 90],
];

function rangeFromParams(sp: { from?: string; to?: string; days?: string }) {
  const valid = (d?: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d! : null);
  const to = valid(sp.to) || todayISO();
  if (valid(sp.from)) return { from: valid(sp.from)!, to };
  const days = Math.max(1, Math.min(365, Number(sp.days) || 30));
  return { from: addDays(to, -(days - 1)), to };
}

function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; days?: string };
}) {
  const s = await requireSession();
  const tt = translator(getLocale());
  const cur = s.currency;
  const { from, to } = rangeFromParams(searchParams);
  const days = daysBetween(from, to);
  const spanDays = days.length;

  const [sales, items, appts, newCustomers] = await Promise.all([
    db.sale.findMany({
      where: { orgId: s.orgId, branchId: s.branchId, date: { gte: from, lte: to } },
      select: { id: true, date: true, total: true, discount: true, method: true, customerId: true },
    }),
    db.saleItem.findMany({
      where: { sale: { orgId: s.orgId, branchId: s.branchId, date: { gte: from, lte: to } } },
      select: { kind: true, name: true, unitPrice: true, qty: true, staffId: true },
    }),
    db.appointment.groupBy({
      by: ["status"],
      where: { orgId: s.orgId, branchId: s.branchId, date: { gte: from, lte: to } },
      _count: true,
    }),
    db.customer.count({ where: { orgId: s.orgId, createdAt: { gte: new Date(from + "T00:00:00"), lte: new Date(to + "T23:59:59") } } }),
  ]);

  // KPIs
  const revenue = sales.reduce((a, x) => a + x.total, 0);
  const txns = sales.length;
  const avgTicket = txns ? Math.round(revenue / txns) : 0;
  const discounts = sales.reduce((a, x) => a + x.discount, 0);
  const serviceRev = items.filter((i) => i.kind === "SERVICE").reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const retailRev = items.filter((i) => i.kind !== "SERVICE").reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const grossItems = serviceRev + retailRev || 1;

  // Revenue by day (for the trend chart)
  const revOn = (d: string) => sales.filter((x) => x.date === d).reduce((a, x) => a + x.total, 0);
  const bars = days.map((d) => ({ d, v: revOn(d) }));
  const maxR = Math.max(1, ...bars.map((b) => b.v));
  // Keep the chart readable for long ranges: cap the number of bars we render.
  const shownBars = spanDays <= 62 ? bars : bars.filter((_, i) => i % Math.ceil(spanDays / 62) === 0);

  // Top services
  const svcAgg = items
    .filter((i) => i.kind === "SERVICE")
    .reduce<Record<string, { n: number; v: number }>>((acc, i) => {
      (acc[i.name] ||= { n: 0, v: 0 }).n += i.qty;
      acc[i.name].v += i.unitPrice * i.qty;
      return acc;
    }, {});
  const topServices = Object.entries(svcAgg).sort((a, b) => b[1].v - a[1].v).slice(0, 8);
  const maxSvc = Math.max(1, ...topServices.map(([, x]) => x.v));

  // Staff performance
  const staff = await db.staff.findMany({ where: { orgId: s.orgId, branchId: s.branchId }, select: { id: true, name: true, title: true, color: true, commissionPct: true } });
  const staffRows = staff
    .map((st) => {
      const own = items.filter((i) => i.staffId === st.id);
      const rev = own.reduce((a, i) => a + i.unitPrice * i.qty, 0);
      const n = own.reduce((a, i) => a + i.qty, 0);
      return { st, rev, n, comm: Math.round((rev * st.commissionPct) / 100) };
    })
    .filter((r) => r.rev > 0 || r.n > 0)
    .sort((a, b) => b.rev - a.rev);
  const maxStaff = Math.max(1, ...staffRows.map((r) => r.rev));

  // Payment methods
  const methodAgg = sales.reduce<Record<string, { n: number; v: number }>>((acc, x) => {
    (acc[x.method] ||= { n: 0, v: 0 }).n += 1;
    acc[x.method].v += x.total;
    return acc;
  }, {});
  const methods = Object.entries(methodAgg).sort((a, b) => b[1].v - a[1].v);

  // Appointment funnel
  const statusCount: Record<string, number> = {};
  for (const a of appts) statusCount[a.status] = a._count;
  const apptTotal = Object.values(statusCount).reduce((a, b) => a + b, 0);
  const completed = statusCount.COMPLETED || 0;
  const cancelled = statusCount.CANCELLED || 0;
  const noshow = statusCount.NOSHOW || 0;
  const noShowRate = apptTotal ? Math.round(((noshow + cancelled) / apptTotal) * 100) : 0;

  // Customers: new vs returning within the range
  const uniqueBuyers = new Set(sales.map((x) => x.customerId).filter(Boolean)).size;

  const preset = (label: string, n: number) => {
    const active = !searchParams.from && (Number(searchParams.days) || 30) === n;
    return (
      <Link
        key={n}
        href={`/reports?days=${n}`}
        className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${active ? "bg-brand text-white" : "bg-white border border-[#e9e6f2] hover:brightness-95"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-xl font-bold">{tt("reports.title")}</h1>
        <div className="flex gap-2 ms-auto">{PRESETS.map(([l, n]) => preset(l, n))}</div>
      </div>
      <p className="text-sm text-[#7a7590] mb-5">
        {dateLabel(from)} — {dateLabel(to)} · {spanDays} {tt("reports.days")} · {s.branchName}
      </p>

      {/* Custom range */}
      <form className="card p-3 mb-5 flex flex-wrap items-end gap-3" action="/reports">
        <div>
          <label className="lbl !mt-0">{tt("reports.from")}</label>
          <input className="inp !w-44" type="date" name="from" defaultValue={from} max={to} />
        </div>
        <div>
          <label className="lbl !mt-0">{tt("reports.to")}</label>
          <input className="inp !w-44" type="date" name="to" defaultValue={to} max={todayISO()} />
        </div>
        <button className="btn-ghost">{tt("reports.applyRange")}</button>
      </form>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4 mb-5">
        <div className="card p-4">
          <div className="text-xs font-semibold text-[#7a7590]">{tt("reports.revenue")}</div>
          <div className="text-2xl font-extrabold mt-1">{fmtMoney(revenue, cur)}</div>
          <div className="text-xs text-[#7a7590] mt-1">{txns} transactions</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-[#7a7590]">{tt("reports.avgTicket")}</div>
          <div className="text-2xl font-extrabold mt-1">{fmtMoney(avgTicket, cur)}</div>
          <div className="text-xs text-[#7a7590] mt-1">per transaction</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-[#7a7590]">{tt("reports.discounts")}</div>
          <div className="text-2xl font-extrabold mt-1">{fmtMoney(discounts, cur)}</div>
          <div className="text-xs text-[#7a7590] mt-1">{revenue ? Math.round((discounts / (revenue + discounts)) * 100) : 0}% of gross</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-[#7a7590]">{tt("reports.uniqueClients")}</div>
          <div className="text-2xl font-extrabold mt-1">{uniqueBuyers}</div>
          <div className="text-xs text-[#7a7590] mt-1">{newCustomers} {tt("reports.newSignups")}</div>
        </div>
      </div>

      {/* Revenue trend + service/retail split */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] mb-5">
        <div className="card p-5">
          <b className="text-sm">{tt("reports.revenueTrend")}</b>
          <div className="flex items-end gap-1 h-44 mt-4">
            {shownBars.map((b) => (
              <div key={b.d} className="flex-1 group relative flex flex-col items-center justify-end">
                <div
                  className={`w-full rounded-t-md ${b.d === todayISO() ? "bg-teal-500" : "bg-brand"}`}
                  style={{ height: `${Math.round((b.v / maxR) * 100)}%`, minHeight: b.v > 0 ? 3 : 0 }}
                  title={`${dateLabel(b.d)}: ${fmtMoney(b.v, cur)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#7a7590] mt-2">
            <span>{dateLabel(from)}</span>
            <span>{dateLabel(to)}</span>
          </div>
        </div>
        <div className="card p-5">
          <b className="text-sm">{tt("reports.revenueMix")}</b>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{tt("reports.services")}</span>
                <b>{fmtMoney(serviceRev, cur)}</b>
              </div>
              <div className="h-2.5 rounded-full bg-[#eeedf3] overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${Math.round((serviceRev / grossItems) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{tt("reports.retail")}</span>
                <b>{fmtMoney(retailRev, cur)}</b>
              </div>
              <div className="h-2.5 rounded-full bg-[#eeedf3] overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round((retailRev / grossItems) * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-dashed border-[#e9e6f2]">
            <b className="text-sm">{tt("reports.paymentMethods")}</b>
            <div className="mt-2">
              {methods.length ? methods.map(([m, x]) => (
                <div key={m} className="flex justify-between py-1.5 text-sm">
                  <span className="chip bg-[#eeedf3] text-[#7a7590]">{m}</span>
                  <span>{fmtMoney(x.v, cur)} <span className="text-xs text-[#7a7590]">· {x.n}</span></span>
                </div>
              )) : <p className="text-sm text-[#7a7590] mt-1">No sales in range.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Top services + staff performance */}
      <div className="grid gap-4 lg:grid-cols-2 mb-5">
        <div className="card p-5">
          <b className="text-sm">{tt("reports.topServices")}</b>
          <div className="mt-3 space-y-2.5">
            {topServices.length ? topServices.map(([n, x]) => (
              <div key={n}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{n} <span className="text-[#7a7590] text-xs">×{x.n}</span></span>
                  <b>{fmtMoney(x.v, cur)}</b>
                </div>
                <div className="h-2 rounded-full bg-[#eeedf3] overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.round((x.v / maxSvc) * 100)}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-[#7a7590] mt-1">No service sales in range.</p>}
          </div>
        </div>
        <div className="card p-5">
          <b className="text-sm">{tt("reports.staffPerformance")}</b>
          <div className="mt-3 space-y-2.5">
            {staffRows.length ? staffRows.map((r) => (
              <div key={r.st.id}>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <div className="w-6 h-6 rounded-full grid place-items-center text-white text-[10px] font-bold shrink-0" style={{ background: r.st.color }}>{initials(r.st.name)}</div>
                  <span className="truncate">{r.st.name}</span>
                  <span className="text-[#7a7590] text-xs">×{r.n}</span>
                  <b className="ml-auto">{fmtMoney(r.rev, cur)}</b>
                </div>
                <div className="h-2 rounded-full bg-[#eeedf3] overflow-hidden ml-8">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((r.rev / maxStaff) * 100)}%`, background: r.st.color }} />
                </div>
              </div>
            )) : <p className="text-sm text-[#7a7590] mt-1">No attributed sales in range.</p>}
          </div>
        </div>
      </div>

      {/* Appointment funnel */}
      <div className="card p-5">
        <b className="text-sm">{tt("reports.appointments")}</b>
        <div className="grid gap-4 md:grid-cols-5 mt-4">
          {[
            [tt("common.total"), apptTotal, "text-[#1c1830]"],
            [tt("reports.completed"), completed, "text-green-600"],
            [tt("reports.cancelled"), cancelled, "text-amber-600"],
            [tt("reports.noshow"), noshow, "text-red-600"],
            [tt("reports.noshowRate"), `${noShowRate}%`, noShowRate > 20 ? "text-red-600" : "text-[#1c1830]"],
          ].map(([label, val, color]) => (
            <div key={label as string}>
              <div className="text-xs font-semibold text-[#7a7590]">{label}</div>
              <div className={`text-2xl font-extrabold mt-1 ${color}`}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
