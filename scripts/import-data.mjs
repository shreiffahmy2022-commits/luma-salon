import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const db = new PrismaClient();

function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = (vals[i] || "").trim()));
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const STAFF = [
  { name: "Erissa", title: "Supervisor", phone: "0558492543", color: "#6d4aff" },
  { name: "Sunshine", title: "Receptionist", phone: "0553297672", color: "#e6a040" },
  { name: "Ram", title: "Stylist", phone: "0567348377", color: "#40a8e6" },
  { name: "Bishnu", title: "Therapist", phone: "0501316855", color: "#e64070" },
  { name: "Rita", title: "Stylist", phone: "0521715726", color: "#40e6a0" },
  { name: "Asbina", title: "Henna Artist", phone: "0524194812", color: "#a040e6" },
  { name: "Saadiya", title: "Henna Artist", phone: "0561494838", color: "#e6d040" },
  { name: "Fathima", title: "Henna Artist", phone: "0501975696", color: "#40e6e6" },
  { name: "Kamala", title: "Nail Tech", phone: "0505631147", color: "#e67040" },
  { name: "Asmita", title: "Nail Tech", phone: "", color: "#7040e6" },
  { name: "Shirjana", title: "Nail Tech", phone: "0541642533", color: "#40e640" },
];

async function main() {
  const org = await db.org.findFirst();
  if (!org) throw new Error("No org found — run the base seed first");
  const branch = await db.branch.findFirst({ where: { orgId: org.id } });
  if (!branch) throw new Error("No branch found");

  console.log(`Importing into org "${org.name}" (${org.id}), branch "${branch.name}" (${branch.id})`);

  // ── IMPORT SERVICES ──
  console.log("\n── Importing Services ──");
  const svcCSV = readFileSync("C:\\Users\\Shrei\\Downloads\\service_template (1) (1).csv", "utf-8");
  const svcRows = parseCSV(svcCSV);

  const services = [];
  for (const row of svcRows) {
    const name = row["service_name"];
    const costStr = row["service_cost"];
    const durStr = row["service_duration (mins)"];
    const category = row["category_name"];
    const subcat = row["Sub-category"];
    if (!name || !costStr || isNaN(parseFloat(costStr))) continue;

    const price = Math.round(parseFloat(costStr));
    const dur = parseInt(durStr) || 60;
    const cat = subcat && subcat !== category ? `${category} — ${subcat}` : category;

    services.push({ name, price, durationMin: dur, category: cat, orgId: org.id });
  }

  const uniqueServices = [];
  const seen = new Set();
  for (const s of services) {
    const key = `${s.name}|${s.category}|${s.price}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueServices.push(s);
    }
  }

  await db.service.deleteMany({ where: { orgId: org.id } });
  let svcCount = 0;
  for (let i = 0; i < uniqueServices.length; i += 50) {
    const batch = uniqueServices.slice(i, i + 50);
    await db.service.createMany({ data: batch });
    svcCount += batch.length;
    process.stdout.write(`\r  Services: ${svcCount}/${uniqueServices.length}`);
  }
  console.log(`\n  ✓ ${svcCount} services imported`);

  // ── IMPORT STAFF ──
  console.log("\n── Importing Staff ──");
  await db.staff.deleteMany({ where: { orgId: org.id } });
  const staffData = STAFF.map((s) => ({
    orgId: org.id,
    branchId: branch.id,
    name: s.name,
    title: s.title,
    phone: s.phone,
    color: s.color,
    baseSalary: s.title === "Supervisor" ? 5000 : s.title === "Receptionist" ? 3500 : 4000,
    commissionPct: s.title === "Receptionist" ? 0 : 15,
  }));
  await db.staff.createMany({ data: staffData });
  console.log(`  ✓ ${staffData.length} staff imported`);

  // ── IMPORT CUSTOMERS ──
  console.log("\n── Importing Customers ──");
  const custCSV = readFileSync("C:\\Users\\Shrei\\Downloads\\customer_template (4) (1).csv", "utf-8");
  const custRows = parseCSV(custCSV);

  const customers = [];
  const phoneSeen = new Set();
  const custLines = custCSV.split("\n").filter((l) => l.trim());
  for (let li = 1; li < custLines.length; li++) {
    const cols = parseCSVLine(custLines[li]);
    const first = (cols[0] || "").trim();
    const last = (cols[1] || "").trim();
    if (!first) continue;

    const name = last ? `${first} ${last}` : first;
    const code = (cols[2] || "971").trim();
    const rawPhone = (cols[3] || "").trim().replace(/\s/g, "");
    if (!rawPhone) continue;

    const phone = `+${code}${rawPhone}`;
    if (phoneSeen.has(phone)) continue;
    phoneSeen.add(phone);

    const email = (cols[5] || "").trim();
    const club = (cols[7] || "").trim();
    const tag = club || "";

    customers.push({ orgId: org.id, name, phone, email, tag });
  }

  await db.customer.deleteMany({ where: { orgId: org.id } });
  let custCount = 0;
  for (let i = 0; i < customers.length; i += 100) {
    const batch = customers.slice(i, i + 100);
    await db.customer.createMany({ data: batch });
    custCount += batch.length;
    process.stdout.write(`\r  Customers: ${custCount}/${customers.length}`);
  }
  console.log(`\n  ✓ ${custCount} customers imported`);

  console.log("\n── Done ──");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
