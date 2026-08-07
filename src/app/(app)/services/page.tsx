import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, t, translator } from "@/lib/i18n";
import { fmtMoney } from "@/lib/util";
import { deleteService, upsertService } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const s = await requireSession();
  const locale = getLocale();
  const tt = translator(locale);
  const isAr = locale === "ar";
  const services = await db.service.findMany({ where: { orgId: s.orgId, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  const cats = [...new Set(services.map((x) => x.category))];
  const sn = (sv: { name: string; nameAr: string }) => isAr && sv.nameAr ? sv.nameAr : sv.name;
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-1">{tt("svc.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{tt("svc.subtitle")}</p>
      <details className="card p-5 mb-5">
        <summary className="cursor-pointer font-semibold text-sm text-brand">＋ {tt("svc.add")}</summary>
        <form action={upsertService} className="grid md:grid-cols-2 gap-x-4 mt-2">
          <div><label className="lbl">{tt("svc.name")}</label><input className="inp" name="name" required /></div>
          <div><label className="lbl">{tt("svc.nameAr")}</label><input className="inp" name="nameAr" /></div>
          <div><label className="lbl">{tt("svc.category")}</label><input className="inp" name="category" list="cats" placeholder="Hair" /><datalist id="cats">{cats.map((c) => <option key={c}>{c}</option>)}</datalist></div>
          <div><label className="lbl">{tt("svc.duration")}</label><input className="inp" name="durationMin" type="number" defaultValue={60} step={15} /></div>
          <div><label className="lbl">{tt("svc.price")} ({s.currency})</label><input className="inp" name="price" type="number" defaultValue={100} /></div>
          <div className="md:col-span-2 mt-3"><button className="btn-primary">{tt("svc.save")}</button></div>
        </form>
      </details>
      {cats.map((cat) => (
        <div key={cat} className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7a7590] mb-2">{t(`cat.${cat}`, locale)}</div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <tbody>
                {services.filter((x) => x.category === cat).map((sv) => (
                  <tr key={sv.id} className="hover:bg-[#faf9fe]">
                    <td className="td font-semibold">{sn(sv)}</td>
                    <td className="td text-[#7a7590]">{sv.durationMin} min</td>
                    <td className="td text-end font-bold">{fmtMoney(sv.price, s.currency)}</td>
                    <td className="td text-end w-40">
                      <details className="inline-block text-start">
                        <summary className="btn-soft !py-1 !px-3 text-xs cursor-pointer list-none inline-flex">{tt("svc.edit")}</summary>
                        <div className="absolute z-10 card p-4 mt-1 w-72 shadow-xl">
                          <form action={upsertService}>
                            <input type="hidden" name="id" value={sv.id} />
                            <label className="lbl">{tt("svc.name")}</label><input className="inp" name="name" defaultValue={sv.name} />
                            <label className="lbl">{tt("svc.nameAr")}</label><input className="inp" name="nameAr" defaultValue={sv.nameAr} dir="rtl" />
                            <label className="lbl">{tt("svc.category")}</label><input className="inp" name="category" defaultValue={sv.category} />
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="lbl">{tt("svc.duration")}</label><input className="inp" name="durationMin" type="number" defaultValue={sv.durationMin} /></div>
                              <div><label className="lbl">{tt("svc.price")}</label><input className="inp" name="price" type="number" defaultValue={sv.price} /></div>
                            </div>
                            <div className="flex gap-2 mt-3"><button className="btn-primary !py-1.5 text-xs">{tt("svc.save")}</button><button formAction={deleteService.bind(null, sv.id)} className="btn-danger !py-1.5 text-xs">{tt("svc.delete")}</button></div>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
