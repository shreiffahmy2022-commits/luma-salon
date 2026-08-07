import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getLocale, t } from "@/lib/i18n";
import { logout } from "../(auth)/actions";
import BranchSwitch from "./branch-switch";
import LangSwitch from "./lang-switch";

const NAV = [
  ["nav.dashboard", "/dashboard", "▦"],
  ["nav.calendar", "/calendar", "🗓"],
  ["nav.pos", "/pos", "🧾"],
  ["nav.sales", "/sales", "💳"],
  ["nav.customers", "/customers", "👥"],
  ["nav.staff", "/staff", "💼"],
  ["nav.payroll", "/payroll", "💰"],
  ["nav.services", "/services", "✂️"],
  ["nav.reports", "/reports", "📊"],
  ["nav.settings", "/settings", "⚙️"],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const locale = getLocale();
  const branches = await db.branch.findMany({
    where: { orgId: s.orgId },
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-brand-dark text-[#bdb6de] p-4 flex flex-col gap-1 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 pb-4 text-white">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-teal-500 grid place-items-center font-extrabold">L</div>
          <div><b>Luma</b><div className="text-[10px] text-[#bdb6de]">{s.orgName}</div></div>
        </div>

        <div className="pb-3 mb-1 border-b border-white/10 flex flex-col gap-2">
          <BranchSwitch branches={branches} activeId={s.branchId} label={t("nav.branch", locale)} />
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8b84b0]">{t("common.language", locale)}</span>
            <LangSwitch locale={locale} />
          </div>
        </div>

        {NAV.map(([label, href, ic]) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5 hover:text-white">
            <span className="w-5 text-center">{ic}</span>{t(label, locale)}
          </Link>
        ))}
        <form action={logout} className="mt-auto">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full hover:bg-white/5 hover:text-white">↩ {t("nav.signout", locale)}</button>
        </form>
      </aside>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
