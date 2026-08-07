"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { fmtMoney } from "@/lib/util";
import { recordSale, type CartLine, type Receipt } from "./actions";

type Svc = { id: string; name: string; category: string; durationMin: number; price: number };
type Prod = { id: string; name: string; price: number; stock: number };
type Ref = { id: string; name: string };
type Labels = Record<string, string>;

export default function POSClient(props: { services: Svc[]; products: Prod[]; staff: Ref[]; customers: Ref[]; currency: string; labels: Labels }) {
  const { services, products, staff, customers, currency, labels: L } = props;
  const router = useRouter();
  const [tab, setTab] = useState("All");
  const [cart, setCart] = useState<(CartLine & { name: string; price: number })[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [method, setMethod] = useState("CARD");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pending, start] = useTransition();

  const cats = useMemo(() => ["All", ...new Set(services.map((s) => s.category)), "Retail"], [services]);
  const shown: { kind: "SERVICE" | "PRODUCT"; id: string; name: string; meta: string; price: number }[] = [
    ...(tab !== "Retail" ? services.filter((s) => tab === "All" || s.category === tab).map((s) => ({ kind: "SERVICE" as const, id: s.id, name: s.name, meta: `${s.category} · ${s.durationMin} min`, price: s.price })) : []),
    ...(tab === "All" || tab === "Retail" ? products.map((p) => ({ kind: "PRODUCT" as const, id: p.id, name: p.name, meta: `${L.retail} · ${p.stock} ${L.stock}`, price: p.price })) : []),
  ];

  const add = (kind: "SERVICE" | "PRODUCT", id: string, name: string, price: number) =>
    setCart((c) => {
      const ex = c.find((l) => l.refId === id && l.kind === kind);
      if (ex) return c.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { kind, refId: id, qty: 1, staffId: staff[0]?.id ?? null, name, price }];
    });
  const bump = (i: number, d: number) =>
    setCart((c) => c.map((l, ix) => (ix === i ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const sub = cart.reduce((a, l) => a + l.price * l.qty, 0);
  const disc = Math.min(sub, Math.round((sub * discountPct) / 100));

  const checkout = () =>
    start(async () => {
      const res = await recordSale({ lines: cart.map(({ name, price, ...l }) => l), customerId: customerId || null, discountPct, method });
      if (res.receipt) { setReceipt(res.receipt); setCart([]); setDiscountPct(0); setCustomerId(""); router.refresh(); }
    });

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{L.title}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{L.subtitle}</p>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {cats.map((c) => (
              <button key={c} onClick={() => setTab(c)} className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold ${tab === c ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-[#e9e6f2]"}`}>{c === "All" ? L.all : c === "Retail" ? L.retail : c}</button>
            ))}
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
            {shown.map((it) => (
              <button key={it.kind + it.id} onClick={() => add(it.kind, it.id, it.name, it.price)} className="card p-3 text-left hover:-translate-y-0.5 hover:border-brand transition">
                <div className="font-bold text-[13px]">{it.name}</div>
                <div className="text-[11px] text-[#7a7590]">{it.meta}</div>
                <div className="font-extrabold text-brand mt-2">{fmtMoney(it.price, currency)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4 sticky top-4">
          <div className="flex items-center mb-2"><b className="text-sm">{L.currentSale}</b>
            {cart.length > 0 && <button className="ms-auto text-xs text-[#7a7590] underline" onClick={() => setCart([])}>{L.clear}</button>}</div>
          <label className="lbl !mt-1">{L.client}</label>
          <select className="inp" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">{L.walkin}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="my-3">
            {cart.length === 0 && <p className="text-sm text-[#7a7590] text-center py-5">{L.tapItems}</p>}
            {cart.map((l, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-dashed border-[#e9e6f2]">
                <div className="flex-1 min-w-0"><b className="text-[13px] block truncate">{l.name}</b><span className="text-xs text-[#7a7590]">{fmtMoney(l.price, currency)}</span></div>
                <select className="inp !w-24 !py-1 !px-1.5 text-xs" value={l.staffId ?? ""} onChange={(e) => setCart((c) => c.map((x, ix) => (ix === i ? { ...x, staffId: e.target.value || null } : x)))}>
                  {staff.map((st) => <option key={st.id} value={st.id}>{st.name.split(" ")[0]}</option>)}
                </select>
                <div className="flex items-center gap-1.5">
                  <button className="w-6 h-6 rounded bg-[#f0eef7] font-bold" onClick={() => bump(i, -1)}>−</button>
                  <b className="text-sm w-4 text-center">{l.qty}</b>
                  <button className="w-6 h-6 rounded bg-[#f0eef7] font-bold" onClick={() => bump(i, 1)}>＋</button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">{L.discount}</label><input className="inp" type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 0)} /></div>
            <div><label className="lbl">{L.payment}</label>
              <div className="flex gap-1.5">
                {["CASH", "CARD", "LINK"].map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2 rounded-lg border-2 text-xs font-bold ${method === m ? "border-brand bg-brand-soft text-brand" : "border-[#e9e6f2] bg-white"}`}>{m}</button>
                ))}
              </div></div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e9e6f2] text-sm">
            <div className="flex justify-between py-0.5"><span>{L.subtotal}</span><span>{fmtMoney(sub, currency)}</span></div>
            <div className="flex justify-between py-0.5"><span>{L.discountAmt}</span><span>− {fmtMoney(disc, currency)}</span></div>
            <div className="flex justify-between py-1 text-lg font-extrabold"><span>{L.total}</span><span>{fmtMoney(sub - disc, currency)}</span></div>
          </div>
          <button className="btn-primary w-full justify-center py-3 mt-3 disabled:opacity-40" disabled={!cart.length || pending} onClick={checkout}>
            {pending ? L.charging : `${L.charge} ${fmtMoney(sub - disc, currency)}`}
          </button>
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={(e) => e.target === e.currentTarget && setReceipt(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-50 text-green-600 grid place-items-center text-2xl mb-2">✓</div>
              <b>{L.paid}</b>
              <div className="text-xs text-[#7a7590]">#{receipt.id} · {receipt.method} · {receipt.customer}</div>
            </div>
            {receipt.items.map((i, ix) => (
              <div key={ix} className="flex justify-between text-sm py-1"><span>{i.name} ×{i.qty} <span className="text-xs text-[#7a7590]">({i.staff})</span></span><span>{fmtMoney(i.unitPrice * i.qty, currency)}</span></div>
            ))}
            <div className="flex justify-between text-sm py-1 border-t border-dashed border-[#e9e6f2] mt-1 pt-2"><span>{L.discountAmt}</span><span>− {fmtMoney(receipt.discount, currency)}</span></div>
            <div className="flex justify-between font-extrabold text-lg"><span>{L.totalPaid}</span><span>{fmtMoney(receipt.total, currency)}</span></div>
            <div className="flex gap-2 mt-4">
              <button className="btn-ghost flex-1 justify-center" onClick={() => setReceipt(null)}>{L.close}</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => window.print()}>{L.print}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
