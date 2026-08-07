import { PrismaClient, ApptStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
let seedN = 42;
const rnd = () => { seedN = (seedN * 1103515245 + 12345) % 2147483648; return seedN / 2147483648; };
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];

async function main() {
  const existing = await db.org.findUnique({ where: { slug: "luma" } });
  if (existing) { console.log("Demo org already seeded."); return; }

  const org = await db.org.create({ data: { name: "Luxury Harrods Beauty & Spa", slug: "luma", currency: "AED" } });
  const branch = await db.branch.create({ data: { orgId: org.id, name: "Jumeirah" } });
  await db.user.create({
    data: { orgId: org.id, email: "owner@luma.demo", name: "Shreif Fahmy", role: "OWNER", passwordHash: await bcrypt.hash("demo1234", 10) },
  });

  // ── Staff ──────────────────────────────────────────────
  const staffData = [
    { name: "Sara Haddad", title: "Senior Hair Stylist", baseSalary: 4500, commissionPct: 20, color: "#6d4aff" },
    { name: "Layla Mansour", title: "Nail Technician", baseSalary: 3200, commissionPct: 15, color: "#0fb5a6" },
    { name: "Fatima Al-Harbi", title: "Henna Artist", baseSalary: 3500, commissionPct: 18, color: "#f59e0b" },
    { name: "Nour El Sayed", title: "Esthetician", baseSalary: 4000, commissionPct: 15, color: "#e5484d" },
    { name: "Huda Aziz", title: "Massage & Spa Therapist", baseSalary: 4200, commissionPct: 22, color: "#2f80ed" },
    { name: "Reem Al-Mutairi", title: "Makeup Artist", baseSalary: 3800, commissionPct: 18, color: "#8b5cf6" },
    { name: "Amina Tariq", title: "Threading & Wax Specialist", baseSalary: 3000, commissionPct: 15, color: "#ec4899" },
  ];
  const staff = [];
  for (const s of staffData) staff.push(await db.staff.create({ data: { ...s, orgId: org.id, branchId: branch.id } }));

  // ── Services (real pricelist) ──────────────────────────
  // [category, name, nameAr, durationMin, price (AED)]
  const svcData: [string, string, string, number, number][] = [
    // ─── Henna ───
    ["Henna", "Gassa Hands", "جصة يد", 30, 53],
    ["Henna", "Gassa Feet", "جصة قدم", 30, 105],
    ["Henna", "Simple Henna (One Side)", "حنة عادية (جانب واحد)", 45, 74],
    ["Henna", "Wrist Henna (One Side)", "حنة للكف (جانب واحد)", 45, 105],
    ["Henna", "Half Hands Henna", "حنة نصف اليد", 60, 158],
    ["Henna", "Full Hands Henna", "حنة يد كاملة", 90, 315],
    ["Henna", "Bridal Henna Hands & Feet", "حنة عروسة اليدين والقدمين", 180, 1260],
    ["Henna", "Red Henna - Full Hands", "حنة حمرة يد كاملة", 90, 368],
    ["Henna", "Red Henna Bridal", "حنة حمرة للعروسة", 180, 1575],
    ["Henna", "Kids Henna - Simple", "حنة أطفال عادية", 30, 53],
    ["Henna", "Kids Henna - Full Hands", "حنة أطفال يد كاملة", 60, 126],
    ["Henna", "Colored Henna Tattoo", "وشم حناء ملونة", 30, 53],
    ["Henna", "Colored Henna Design", "تصميم حناء ملونة", 60, 105],

    // ─── Make Up & Eyelash ───
    ["Make Up & Eyelash", "Eye Make Up with Lashes", "مكياج عيون بالرموش", 45, 210],
    ["Make Up & Eyelash", "Normal Make Up without Lashes", "مكياج عادي بدون رموش", 60, 315],
    ["Make Up & Eyelash", "Normal Make Up with Lashes", "مكياج عادي بالرموش", 90, 368],
    ["Make Up & Eyelash", "Special Arabic Make Up without Lashes", "مكياج عربي بدون رموش", 120, 420],
    ["Make Up & Eyelash", "Special Arabic Make Up with Lashes", "مكياج عربي بالرموش", 120, 525],
    ["Make Up & Eyelash", "Bridal Make Up", "مكياج العروسة", 120, 735],
    ["Make Up & Eyelash", "1 Line Lashes", "رموش خط واحد", 15, 53],
    ["Make Up & Eyelash", "Volume Cluster Weekly Lashes", "رموش أسبوعية كثيفة", 30, 210],
    ["Make Up & Eyelash", "Eyelash Removal", "إزالة الرموش", 15, 79],
    ["Make Up & Eyelash", "Eyelash Touch Up (1 Week)", "إعادة تركيب رموش (أسبوع)", 30, 210],
    ["Make Up & Eyelash", "Eyelash Touch Up (2 Weeks)", "إعادة رموش (أسبوعين)", 45, 263],
    ["Make Up & Eyelash", "Eyelash Perming & Tinting", "رفع الرموش وتلوينها", 45, 315],
    ["Make Up & Eyelash", "Eyebrow Lamination & Color", "رفع الحواجب مع التنظيف واللون", 45, 263],
    ["Make Up & Eyelash", "Eyebrow Microblading", "ميكروبليدنك للحواجب", 120, 2100],
    ["Make Up & Eyelash", "Lip Blushing", "توريد الشفايف", 120, 2100],

    // ─── Threading & Bleaching ───
    ["Threading & Bleaching", "Forehead Threading", "خيط الجبين", 20, 26],
    ["Threading & Bleaching", "Eyebrows Threading", "خيط الحواجب", 20, 42],
    ["Threading & Bleaching", "Cheek Threading", "خيط الخدين", 30, 53],
    ["Threading & Bleaching", "Upper Lip Threading", "خيط فوق الشفاه", 15, 26],
    ["Threading & Bleaching", "Chin Threading", "خيط الذقن", 15, 42],
    ["Threading & Bleaching", "Upper Lip & Chin", "شنب مع الذقن", 20, 53],
    ["Threading & Bleaching", "Full Face without Eyebrows", "الوجه كامل بدون حواجب", 45, 74],
    ["Threading & Bleaching", "Full Face with Eyebrows", "الوجه كامل مع حواجب", 60, 105],
    ["Threading & Bleaching", "Eyebrow Color", "صبغة حواجب", 30, 53],
    ["Threading & Bleaching", "Bleaching - Full Face with Eyebrows", "تشقير وجه كامل مع حواجب", 20, 131],
    ["Threading & Bleaching", "Bleaching - Full Arms", "تشقير يد كاملة", 30, 79],
    ["Threading & Bleaching", "Bleaching - Full Legs", "تشقير رجل كاملة", 60, 105],
    ["Threading & Bleaching", "Bleaching - Full Body", "تشقير جسم كامل", 120, 420],
    ["Threading & Bleaching", "Face Mask", "ماسك للوجه", 20, 42],

    // ─── Hair Removal ───
    ["Hair Removal", "Underarms Wax", "حلاوة تحت الإبطين", 30, 42],
    ["Hair Removal", "Half Arms Wax", "حلاوة نصف اليد", 30, 42],
    ["Hair Removal", "Full Arms Wax", "حلاوة يد كاملة", 45, 63],
    ["Hair Removal", "Half Legs Wax", "حلاوة نصف رجل", 30, 53],
    ["Hair Removal", "Full Legs Wax", "حلاوة رجل كاملة", 60, 84],
    ["Hair Removal", "Bikini Line", "خط البيكيني", 30, 53],
    ["Hair Removal", "Brazilian (Full Bikini)", "برازيليان (بيكيني كامل)", 90, 105],
    ["Hair Removal", "Back Wax", "حلاوة الظهر", 60, 105],
    ["Hair Removal", "Full Body with Bikini", "الجسم كامل مع البيكيني", 90, 368],
    ["Hair Removal", "Full Body without Bikini", "الجسم كامل بدون بيكيني", 90, 263],
    ["Hair Removal", "Cleopatra - Full Face", "كليوباترا وجه كامل", 60, 131],
    ["Hair Removal", "Cleopatra - Full Arms", "كليوباترا يد كاملة", 30, 105],
    ["Hair Removal", "Cleopatra - Full Legs", "كليوباترا رجل كاملة", 60, 126],
    ["Hair Removal", "Cleopatra - Full Body with Bikini", "كليوباترا جسم كامل مع بيكيني", 120, 473],

    // ─── Skin Care ───
    ["Skin Care", "Deep Cleansing Facial", "تنظيف عميق للبشرة", 45, 420],
    ["Skin Care", "Vitamin C Facial", "فيتامين سي للبشرة", 45, 473],
    ["Skin Care", "Deep Cleansing + Microdermabrasion", "تنظيف عميق مع تقشير دقيق", 60, 525],
    ["Skin Care", "Korean Hydra Facial", "هيدرا كوري", 60, 630],
    ["Skin Care", "Hydra Facial", "هيدرا للبشرة", 60, 630],
    ["Skin Care", "Dermaplaning + Hydra Facial", "ديرما بلانينج + هيدرا فيشل", 120, 1050],
    ["Skin Care", "Meso + Dermapen + Facial", "ميزوثيرابي + ديرمابين + فيشل", 120, 1050],
    ["Skin Care", "Thalgo Exception Marine Facial", "ثالغو استثناء البحرية", 120, 840],
    ["Skin Care", "Thalgo Hyalu-Procolagen Facial", "ثالغو هيالو بروكولاجين فيشل", 120, 735],
    ["Skin Care", "Dermaplaning", "ديرما بلانينج", 30, 158],
    ["Skin Care", "Lip Treatment", "علاج الشفاه", 20, 105],
    ["Skin Care", "Eye Treatment - Hyaluronic & Collagen", "علاج العين بالهيالورونيك والكولاجين", 20, 210],
    ["Skin Care", "Dermapen Skin Booster", "ديرمابين سكين بوستر", 45, 735],
    ["Skin Care", "RF Radio Frequency", "تردد الراديو", 60, 420],
    ["Skin Care", "RF Microneedling", "الوخز بالإبر الدقيقة", 60, 1260],
    ["Skin Care", "Cavitation Slimming", "تنحيف التجويف", 60, 420],
    ["Skin Care", "Kim K Curving & Reshaping", "كيم ك التقويس وإعادة تشكيل", 60, 420],

    // ─── Body Spa ───
    ["Body Spa", "Normal Moroccan Bath", "حمام مغربي عادي", 45, 158],
    ["Body Spa", "Herbal Moroccan Bath", "حمام مغربي بالأعشاب", 60, 263],
    ["Body Spa", "Rheumatism/Aroma Moroccan Bath", "حمام مغربي للروماتيزم", 75, 315],
    ["Body Spa", "Organic Moroccan Bath", "حمام مغربي أورجانيك", 75, 314],
    ["Body Spa", "After Delivery Moroccan Bath", "حمام مغربي بعد الولادة", 90, 368],
    ["Body Spa", "Luxury Bridal Moroccan Bath", "حمام ملكي فاخر للعروس", 120, 735],
    ["Body Spa", "Body Polish Normal", "بوليش عادي للجسم", 40, 263],
    ["Body Spa", "Body Polish Luxury", "لاكشوري بوليش للجسم", 40, 368],
    ["Body Spa", "Head, Neck & Shoulders Massage 30m", "مساج الرأس والرقبة والكتفين ٣٠د", 30, 105],
    ["Body Spa", "Relaxing Massage 60m", "مساج استرخائي ٦٠د", 60, 210],
    ["Body Spa", "Relaxing Massage 90m", "مساج استرخائي ٩٠د", 90, 315],
    ["Body Spa", "Herbal Ball Massage 60m", "تدليك بالكرة العشبية ٦٠د", 60, 315],
    ["Body Spa", "Aromatherapy Massage 60m", "أروماثيرابي ٦٠د", 60, 315],
    ["Body Spa", "Hot Stone Massage 60m", "مساج الحجر الساخن ٦٠د", 60, 315],
    ["Body Spa", "Bamboo Massage 60m", "مساج البامبو ٦٠د", 60, 315],
    ["Body Spa", "Maderotherapy Slimming", "مساج التخسيس بالماديرو", 60, 368],
    ["Body Spa", "Gua Sha Anti-Cellulite", "مساج جواشا للسيلوليت", 60, 368],
    ["Body Spa", "Deep Tissue Slimming", "تدليك الأنسجة للتنحيف", 60, 368],
    ["Body Spa", "Lymphatic Massage (Post Surgery)", "التدليك اللمفاوي بعد الجراحة", 60, 315],
    ["Body Spa", "Yoga Face Lifting Massage", "مساج اليوجا لرفع الوجه", 45, 263],

    // ─── Hair ───
    ["Hair", "Hair Trim (Adult)", "قصة أطراف الشعر", 30, 53],
    ["Hair", "Fringe Cut", "قص القصة", 20, 32],
    ["Hair", "Straight Hair Cut", "قصة شعر متساوية", 45, 126],
    ["Hair", "Re-style Hair Cut", "تسريحة قص الشعر", 60, 189],
    ["Hair", "Hair Style S/M/L", "تسريحة شعر", 60, 210],
    ["Hair", "Bridal Hair Style", "تسريحة العروس", 90, 420],
    ["Hair", "Kids Hair Braid", "ضفيرة للأطفال", 30, 53],
    ["Hair", "Adult Hair Braid", "ضفيرة للبالغين", 45, 84],
    ["Hair", "Blowdry S/M/L", "سشوار", 45, 84],
    ["Hair", "Blowdry with Ceramic", "سشوار مع المكواة", 60, 137],
    ["Hair", "Standard Hair Wash & Dry", "غسل الشعر مع التنشيف", 30, 47],
    ["Hair", "Professional Hair Wash & Dry", "غسل الشعر بالبروفشنل لاين", 30, 79],
    ["Hair", "Highlights S/M/L", "هيلايت", 120, 420],
    ["Hair", "Highlights with Loreal Detox", "هيلايت مع لوريال ديتوكس", 150, 630],
    ["Hair", "Ombre / Balayage", "أومبري / بلاياج", 150, 630],
    ["Hair", "Roots Hair Color", "صباغة جذور الشعر", 60, 210],
    ["Hair", "Full Hair Color", "صباغة شعر كامل", 90, 420],
    ["Hair", "Hair Henna", "حنة للشعر", 60, 263],
    ["Hair", "Kids Hair Henna", "حنة شعر للأطفال", 45, 105],
    ["Hair", "Alfaparf Hair Treatment", "علاج الفابراف للشعر", 60, 263],
    ["Hair", "Schwarzkopf Hair Treatment", "علاج شوارسكوف للشعر", 60, 263],
    ["Hair", "Luxury Argan Treatment", "علاج لاكشري أرجان للشعر", 60, 263],
    ["Hair", "Moremo Hair Treatment", "علاج موريمو للشعر", 60, 263],
    ["Hair", "Organic Oil Treatment", "علاج زيت طبيعي للشعر", 60, 210],
    ["Hair", "Organic Mask Treatment", "ماسك طبيعي للشعر", 60, 263],
    ["Hair", "Cystein Hair Protein", "كريستال بروتين للشعر", 120, 1050],

    // ─── Nails & Spa ───
    ["Nails & Spa", "Basic Spa Hands", "بازيك سبا يدين", 30, 53],
    ["Nails & Spa", "Basic Spa Feet", "بازيك سبا قدمين", 30, 53],
    ["Nails & Spa", "Kids Standard Spa", "ستاندارد سبا أطفال", 30, 42],
    ["Nails & Spa", "Standard Spa Hands", "ستاندارد سبا يدين", 45, 74],
    ["Nails & Spa", "Standard Spa Feet", "ستاندارد سبا قدمين", 45, 84],
    ["Nails & Spa", "Indulgence Spa Hands", "سبا فاخر يدين", 45, 84],
    ["Nails & Spa", "Luxury Elim Spa", "إيليم سبا لاكشري", 60, 142],
    ["Nails & Spa", "Paraffin Treatment", "علاج البارافين", 30, 53],
    ["Nails & Spa", "Callus Removal", "إزالة الجلد الميت", 20, 53],
    ["Nails & Spa", "Gel Polish Hands", "جيل بوليش يدين", 30, 84],
    ["Nails & Spa", "Gel Polish Feet", "جيل بوليش قدمين", 30, 84],
    ["Nails & Spa", "GR Gel Polish Hands", "جيل بوليش GR يدين", 30, 147],
    ["Nails & Spa", "French Gel Polish", "فرنش جيل بوليش", 40, 158],
    ["Nails & Spa", "Normal Nail Extension", "تركيب أظافر عادية", 60, 158],
    ["Nails & Spa", "Dip & Buff Overlay S/M/L", "ديب بيف", 60, 210],
    ["Nails & Spa", "Acrylic Extension S/M/L", "أكريليك", 75, 315],
    ["Nails & Spa", "French/Ombre Acrylic", "أكريليك فرنش/أومبري", 90, 420],
    ["Nails & Spa", "Softgel with Color", "سوفت جيل مع لون", 60, 368],
    ["Nails & Spa", "GR Hardgel S/M/L", "هارد جيل GR", 75, 368],
    ["Nails & Spa", "Nail Art (per nail)", "رسم على الأظافر", 10, 16],
    ["Nails & Spa", "Gel Removal", "إزالة الجيل", 15, 26],
    ["Nails & Spa", "Acrylic Removal", "إزالة الأكريليك", 30, 105],
    ["Nails & Spa", "Ombre Airbrush Nail", "أومبري إيربراش", 30, 105],
  ];

  const services = [];
  for (const [category, name, nameAr, durationMin, price] of svcData)
    services.push(await db.service.create({ data: { orgId: org.id, category, name, nameAr, durationMin, price } }));

  // ── Products ───────────────────────────────────────────
  for (const [name, price, stock] of [
    ["Argan Repair Shampoo", 85, 24],
    ["Keratin Hair Mask", 130, 12],
    ["Cuticle Oil", 45, 30],
    ["Vitamin C Serum", 210, 9],
    ["Moroccan Oil Treatment", 95, 15],
    ["Thalgo Marine Cream", 180, 8],
    ["Henna Paste Cone", 25, 50],
    ["Eyelash Glue", 35, 20],
  ] as const)
    await db.product.create({ data: { orgId: org.id, name, price, stock } });

  // ── Customers ──────────────────────────────────────────
  const custNames = ["Mona Al Rashid", "Dana Suleiman", "Aisha Karim", "Rania Fares", "Yousef Nader", "Lina Habib", "Farah Odeh", "Khaled Amin", "Salma Idris", "Noor Barakat"];
  const customers = [];
  for (let i = 0; i < custNames.length; i++)
    customers.push(await db.customer.create({
      data: {
        orgId: org.id, name: custNames[i],
        phone: `+971 5${i % 5} ${200 + i * 7} ${1000 + i * 311}`,
        email: custNames[i].toLowerCase().replace(/[^a-z]+/g, ".") + "@mail.com",
        tag: i < 2 ? "vip" : i > 7 ? "new" : "",
        notes: i === 0 ? "Prefers Sara. Allergic to ammonia-based color." : "",
      },
    }));

  // ── Appointments ───────────────────────────────────────
  const today = iso(new Date());
  for (let off = -6; off <= 5; off++) {
    const date = addDays(today, off);
    const n = 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const st = pick(staff), sv = pick(services), cu = pick(customers);
      const startMin = 600 + 30 * Math.floor(rnd() * 18);
      let status: ApptStatus = "BOOKED";
      if (off < 0) status = rnd() < 0.82 ? "COMPLETED" : rnd() < 0.5 ? "CANCELLED" : "NOSHOW";
      else if (off > 0 && rnd() < 0.4) status = "CONFIRMED";
      await db.appointment.create({
        data: { orgId: org.id, branchId: branch.id, staffId: st.id, serviceId: sv.id, customerId: cu.id, date, startMin, durationMin: sv.durationMin, status },
      });
    }
  }

  // ── Sales ──────────────────────────────────────────────
  const now = new Date();
  for (let m = 0; m < 2; m++) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const daysIn = m === 0 ? now.getDate() : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysIn; d++) {
      const cnt = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < cnt; k++) {
        const st = pick(staff), cu = pick(customers), sv = pick(services);
        const sub = sv.price;
        const discount = rnd() < 0.15 ? Math.round(sub * 0.1) : 0;
        await db.sale.create({
          data: {
            orgId: org.id, branchId: branch.id, customerId: cu.id,
            date: iso(new Date(base.getFullYear(), base.getMonth(), d)),
            method: pick(["CASH", "CARD", "CARD", "LINK"]), discount, total: sub - discount,
            items: { create: [{ kind: "SERVICE", name: sv.name, unitPrice: sv.price, qty: 1, staffId: st.id }] },
          },
        });
      }
    }
  }
  console.log("Seeded demo org with real pricelist. Login: owner@luma.demo / demo1234 — booking page: /book/luma");
}

main().finally(() => db.$disconnect());
