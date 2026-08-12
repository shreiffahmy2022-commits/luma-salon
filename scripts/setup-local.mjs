#!/usr/bin/env node
/**
 * One-command local bootstrap for Luma.
 *
 *   npm run setup
 *
 * Idempotent: safe to re-run. It will
 *   1. create .env from .env.example (if missing) and drop in a random AUTH_SECRET,
 *   2. push the Prisma schema to the database in DATABASE_URL,
 *   3. seed the demo salon (staff, services, bookings, sales).
 *
 * It does NOT start PostgreSQL — that step is platform-specific. If the DB
 * isn't reachable the script stops and tells you how to start one.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m",
};
const ok = (m) => console.log(`${c.green}✓${c.reset} ${m}`);
const info = (m) => console.log(`${c.cyan}›${c.reset} ${m}`);
const warn = (m) => console.log(`${c.yellow}!${c.reset} ${m}`);

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

// 1. .env ------------------------------------------------------------------
if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    console.error(`${c.red}✗${c.reset} No .env and no .env.example to copy from.`);
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  ok("Created .env from .env.example");
} else {
  info(".env already exists — leaving it as is");
}

// Replace a placeholder AUTH_SECRET with a real random one.
let env = readFileSync(envPath, "utf8");
if (/AUTH_SECRET\s*=\s*"?(change-me[^"\n]*|)"?\s*$/m.test(env)) {
  const secret = randomBytes(32).toString("base64url");
  env = env.replace(/AUTH_SECRET\s*=.*$/m, `AUTH_SECRET="${secret}"`);
  writeFileSync(envPath, env);
  ok("Generated a random AUTH_SECRET");
} else {
  info("AUTH_SECRET already set — keeping it");
}

const dbUrl = (env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1];
if (dbUrl) info(`Using DATABASE_URL ${c.dim}${dbUrl.replace(/:[^:@/]+@/, ":****@")}${c.reset}`);

// 2. schema ----------------------------------------------------------------
info("Pushing Prisma schema (npx prisma db push)…");
try {
  run("npx prisma db push");
  ok("Database schema is in sync");
} catch {
  console.log();
  warn("Could not reach the database. Start PostgreSQL, then re-run `npm run setup`.");
  console.log(`  ${c.dim}Docker:${c.reset}  docker compose up -d`);
  console.log(`  ${c.dim}Windows portable PG (this repo's setup):${c.reset}`);
  console.log(`           "C:\\Users\\Shrei\\pg16\\pgsql\\bin\\pg_ctl.exe" -D "C:\\Users\\Shrei\\pgdata" -l "C:\\Users\\Shrei\\pgdata\\server.log" -o "-p 5433" start`);
  console.log(`  ${c.dim}Then make sure DATABASE_URL in .env points at it (Windows portable = port 5433).${c.reset}`);
  process.exit(1);
}

// 3. seed ------------------------------------------------------------------
info("Seeding demo data (npm run db:seed)…");
run("npm run db:seed");

console.log();
ok(`${c.bold}Setup complete.${c.reset}`);
console.log(`  Start the app:   ${c.cyan}npm run dev${c.reset}   → http://localhost:3000`);
console.log(`  Demo login:      owner@luma.demo / demo1234`);
console.log(`  Booking page:    http://localhost:3000/book/luma`);
