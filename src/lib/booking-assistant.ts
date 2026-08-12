import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAnthropic, AI_MODEL } from "@/lib/ai";
import { getSlots, createOnlineBooking } from "@/app/book/[slug]/actions";
import { OPEN_MIN, CLOSE_MIN } from "@/lib/availability";
import { minToStr, todayISO } from "@/lib/util";

/**
 * Server-side AI booking assistant for the public booking page (/book/<slug>).
 *
 * The org is resolved from the slug on the server and every tool is scoped to
 * it — the browser never supplies an orgId, and create_booking re-validates
 * the slot server-side (via the same createOnlineBooking used by the wizard),
 * so a client cannot book outside its salon or force a double-booking even if
 * it replays fabricated tool results in the message history.
 */

export type OrgContext = {
  slug: string;
  org: { id: string; name: string; currency: string };
  services: { id: string; name: string; category: string; durationMin: number; price: number }[];
  staff: { id: string; name: string; title: string; branchId: string }[];
  branches: { id: string; name: string }[];
};

export async function loadOrgContext(slug: string): Promise<OrgContext | null> {
  const org = await db.org.findUnique({ where: { slug }, select: { id: true, name: true, currency: true } });
  if (!org) return null;
  const [services, staff, branches] = await Promise.all([
    db.service.findMany({
      where: { orgId: org.id, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, durationMin: true, price: true },
    }),
    db.staff.findMany({
      where: { orgId: org.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true, branchId: true },
    }),
    db.branch.findMany({ where: { orgId: org.id }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);
  return { slug, org, services, staff, branches };
}

// ---- Tool definitions -----------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Look up real open appointment slots for a service on a specific date. ALWAYS call this before offering or confirming any time — never guess or invent availability. Returns the free start times, each already matched to an available professional.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", description: "The service name exactly as listed in the menu (e.g. \"Women's Haircut\")." },
        date: { type: "string", description: "Date to check, as YYYY-MM-DD. Resolve relative dates like 'this Friday' yourself using today's date from the system prompt." },
        professional: { type: "string", description: "Optional. A specific professional's name. Omit to check across all available professionals." },
        branch: { type: "string", description: "Optional. Branch/location name. Omit when the salon has a single location." },
      },
      required: ["service", "date"],
    },
  },
  {
    name: "create_booking",
    description:
      "Book an appointment. Only call after (1) confirming a real slot via check_availability and (2) collecting and reading back the customer's full name and phone number. Re-validates the slot server-side and returns a booking reference on success.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", description: "Service name exactly as listed." },
        date: { type: "string", description: "YYYY-MM-DD." },
        start_min: { type: "integer", description: "Start time in minutes from midnight — use the exact start_min value returned by check_availability for the chosen slot." },
        professional: { type: "string", description: "Optional. The chosen professional's name. Omit to let the salon assign any available professional for that slot." },
        customer_name: { type: "string", description: "The customer's full name." },
        customer_phone: { type: "string", description: "The customer's phone number." },
        branch: { type: "string", description: "Optional branch/location name." },
        notes: { type: "string", description: "Optional notes or requests from the customer." },
      },
      required: ["service", "date", "start_min", "customer_name", "customer_phone"],
    },
  },
];

// ---- Resolvers ------------------------------------------------------------

class ToolError extends Error {}

function resolveService(ctx: OrgContext, name: string) {
  const q = (name || "").trim().toLowerCase();
  if (!q) throw new ToolError("Please tell me which service.");
  const exact = ctx.services.find((s) => s.name.toLowerCase() === q);
  if (exact) return exact;
  const partial = ctx.services.filter((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new ToolError(`Which one did you mean: ${partial.map((s) => s.name).join(", ")}?`);
  throw new ToolError(`We don't have a service called "${name}". Available services: ${ctx.services.map((s) => s.name).join(", ")}.`);
}

function resolveBranch(ctx: OrgContext, name?: string) {
  if (!name || !name.trim()) return ctx.branches[0];
  const q = name.trim().toLowerCase();
  const found = ctx.branches.find((b) => b.name.toLowerCase() === q) || ctx.branches.find((b) => b.name.toLowerCase().includes(q));
  if (!found) throw new ToolError(`We don't have a location called "${name}". Locations: ${ctx.branches.map((b) => b.name).join(", ")}.`);
  return found;
}

function resolveStaff(ctx: OrgContext, branchId: string, name: string) {
  const q = (name || "").trim().toLowerCase();
  const inBranch = ctx.staff.filter((s) => s.branchId === branchId);
  const found = inBranch.find((s) => s.name.toLowerCase() === q) || inBranch.find((s) => s.name.toLowerCase().includes(q));
  if (!found) throw new ToolError(`We don't have a professional called "${name}" at that location. Team: ${inBranch.map((s) => s.name).join(", ")}.`);
  return found;
}

const staffName = (ctx: OrgContext, id: string) => ctx.staff.find((s) => s.id === id)?.name ?? "a professional";

// ---- Tool dispatch --------------------------------------------------------

async function runTool(ctx: OrgContext, name: string, input: any): Promise<unknown> {
  try {
    if (name === "check_availability") {
      const service = resolveService(ctx, input.service);
      const branch = resolveBranch(ctx, input.branch);
      const staffId = input.professional ? resolveStaff(ctx, branch.id, input.professional).id : null;
      const { slots, error } = await getSlots(ctx.slug, input.date, service.id, staffId, branch.id);
      if (error) return { error };
      const shown = slots.slice(0, 24).map((s) => ({
        time: minToStr(s.startMin),
        start_min: s.startMin,
        professional: staffName(ctx, s.staffId),
      }));
      return {
        service: service.name,
        date: input.date,
        branch: ctx.branches.length > 1 ? branch.name : undefined,
        available_slots: shown,
        note: shown.length === 0 ? "No open slots on this date — suggest another day." : undefined,
      };
    }

    if (name === "create_booking") {
      const service = resolveService(ctx, input.service);
      const branch = resolveBranch(ctx, input.branch);
      let staffId: string;
      if (input.professional) {
        staffId = resolveStaff(ctx, branch.id, input.professional).id;
      } else {
        const { slots } = await getSlots(ctx.slug, input.date, service.id, null, branch.id);
        const match = slots.find((s) => s.startMin === Number(input.start_min));
        if (!match) return { booked: false, error: "That time is no longer available — please check availability again." };
        staffId = match.staffId;
      }
      const res = await createOnlineBooking({
        slug: ctx.slug,
        date: input.date,
        startMin: Number(input.start_min),
        staffId,
        serviceId: service.id,
        branchId: branch.id,
        name: input.customer_name,
        phone: input.customer_phone,
        email: "",
        notes: input.notes || "",
      });
      if (res.error) return { booked: false, error: res.error };
      return {
        booked: true,
        reference: res.ref,
        service: service.name,
        professional: staffName(ctx, staffId),
        date: input.date,
        time: minToStr(Number(input.start_min)),
        branch: ctx.branches.length > 1 ? branch.name : undefined,
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (e) {
    if (e instanceof ToolError) return { error: e.message };
    return { error: "Something went wrong looking that up — please try again." };
  }
}

// ---- System prompt --------------------------------------------------------

function buildSystemPrompt(ctx: OrgContext): string {
  const today = todayISO();
  const todayLabel = new Date(today + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const cur = ctx.org.currency;
  const menu = ctx.services
    .map((s) => `- ${s.name} (${s.category}) — ${s.durationMin} min — ${cur} ${s.price}`)
    .join("\n");
  const multiBranch = ctx.branches.length > 1;
  const team = ctx.staff
    .map((s) => (multiBranch ? `- ${s.name}${s.title ? `, ${s.title}` : ""} (${ctx.branches.find((b) => b.id === s.branchId)?.name ?? ""})` : `- ${s.name}${s.title ? `, ${s.title}` : ""}`))
    .join("\n");

  return [
    `You are the friendly online booking assistant for ${ctx.org.name}, a salon & spa. You help customers book an appointment through chat.`,
    ``,
    `Today is ${todayLabel} (${today}). The salon is open 10:00 AM to 9:00 PM (${OPEN_MIN / 60}:00–${CLOSE_MIN / 60}:00), and appointments start on the hour or half-hour. Prices are in ${cur}.`,
    ``,
    `SERVICES:\n${menu}`,
    ``,
    `TEAM${multiBranch ? " (with location)" : ""}:\n${team}`,
    multiBranch ? `\nLOCATIONS:\n${ctx.branches.map((b) => `- ${b.name}`).join("\n")}` : ``,
    ``,
    `How to help:`,
    `- Keep replies short, warm and concise. Reply in the customer's language.`,
    `- Work out relative dates ("this Friday", "tomorrow") yourself from today's date above.`,
    `- ALWAYS call check_availability before offering or confirming any time. Never invent slots or promise a time you haven't verified.`,
    `- Offer a few concrete options; don't dump the whole list.`,
    `- Before booking, collect the customer's full name and phone number, then read back the full booking (service, professional, date, time) for confirmation.`,
    `- Only then call create_booking. Afterwards, share the booking reference and a warm closing.`,
    `- If a slot is taken or a name doesn't match, apologise briefly and offer the real alternatives the tools return.`,
    `- Politely decline anything unrelated to booking at this salon.`,
  ].filter(Boolean).join("\n");
}

// ---- Turn loop ------------------------------------------------------------

const MAX_TOOL_ROUNDS = 6;

/** Runs one assistant turn (model + tool loop) and returns the updated history. */
export async function runAssistant(
  ctx: OrgContext,
  history: Anthropic.MessageParam[],
): Promise<Anthropic.MessageParam[]> {
  const client = getAnthropic();
  if (!client) throw new Error("AI is not configured");

  const messages = [...history];
  const system = buildSystemPrompt(ctx);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      // Array form + cache_control caches the (stable) system prompt and tool
      // definitions across every tool round and follow-up turn in a chat.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type === "tool_use") {
        const output = await runTool(ctx, block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(output),
        });
      }
    }
    if (toolResults.length === 0) break;
    messages.push({ role: "user", content: toolResults });
  }

  return messages;
}
