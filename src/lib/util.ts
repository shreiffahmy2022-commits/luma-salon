export const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => isoDate(new Date());
export const addDays = (s: string, n: number) => {
  const d = new Date(s + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export const minToStr = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${pad(mm)} ${ap}`;
};
export const dateLabel = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const monthLabel = (ym: string) =>
  new Date(ym + "-02T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
export const fmtMoney = (v: number, cur: string) => `${cur} ${Number(v || 0).toLocaleString("en")}`;
export const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
/** URL-safe org slug used for the public booking page (/book/<slug>). */
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
