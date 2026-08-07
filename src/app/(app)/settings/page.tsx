import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, translator } from "@/lib/i18n";
import { addBranch, renameBranch, updateOrg } from "./actions";
import SlugForm from "./slug-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await requireSession();
  const tt = translator(getLocale());
  const [org, branches] = await Promise.all([
    db.org.findUniqueOrThrow({ where: { id: s.orgId } }),
    db.branch.findMany({ where: { orgId: s.orgId }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-1">{tt("set.title")}</h1>
      <p className="text-sm text-[#7a7590] mb-5">{tt("set.subtitle")}</p>

      <div className="card p-6 mb-4">
        <form action={updateOrg}>
          <label className="lbl !mt-0">{tt("set.businessName")}</label>
          <input className="inp" name="name" defaultValue={org.name} />
          <label className="lbl">{tt("set.currency")}</label>
          <input className="inp !w-32" name="currency" defaultValue={org.currency} maxLength={4} />
          <button className="btn-primary mt-4">{tt("set.save")}</button>
        </form>
      </div>

      <div className="card p-6 mb-4">
        <b className="text-sm">{tt("set.branches")}</b>
        <p className="text-sm text-[#7a7590] mt-1 mb-3">{tt("set.branchesHelp")}</p>
        <div className="divide-y divide-[#e9e6f2]">
          {branches.map((b) => (
            <form key={b.id} action={renameBranch} className="flex items-center gap-2 py-2">
              <input type="hidden" name="id" value={b.id} />
              <input className="inp" name="name" defaultValue={b.name} />
              {b.id === s.branchId && <span className="chip bg-brand-soft text-brand shrink-0">{tt("set.active")}</span>}
              <button className="btn-ghost !py-1.5 !px-3 text-xs shrink-0">{tt("set.rename")}</button>
            </form>
          ))}
        </div>
        <form action={addBranch} className="flex items-center gap-2 mt-4 pt-4 border-t border-dashed border-[#e9e6f2]">
          <input className="inp" name="name" placeholder={tt("set.newBranch")} required />
          <button className="btn-primary !py-2 !px-4 text-sm shrink-0">＋ {tt("set.addBranch")}</button>
        </form>
      </div>

      <div className="card p-6">
        <b className="text-sm">{tt("set.bookingPage")}</b>
        <p className="text-sm text-[#7a7590] mt-1">{tt("set.bookingHelp")}</p>
        <code className="block bg-[#f6f5fa] rounded-lg px-3 py-2 mt-2 text-sm text-brand font-semibold">/book/{org.slug}</code>

        <SlugForm
          slug={org.slug}
          labels={{
            address: tt("set.bookingAddress"), help: tt("set.bookingAddressHelp"), update: tt("set.updateLink"),
            ok: tt("set.slugOk"), taken: tt("set.slugTaken"), invalid: tt("set.slugInvalid"),
          }}
        />
      </div>
    </div>
  );
}
