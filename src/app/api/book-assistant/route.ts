import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { aiConfigured } from "@/lib/ai";
import { loadOrgContext, runAssistant } from "@/lib/booking-assistant";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 60;

function assistantText(text: string): Anthropic.MessageParam {
  return { role: "assistant", content: [{ type: "text", text }] };
}

export async function POST(req: Request) {
  let body: { slug?: string; messages?: Anthropic.MessageParam[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!slug || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ctx = await loadOrgContext(slug);
  if (!ctx) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  if (!aiConfigured()) {
    return NextResponse.json({
      configured: false,
      messages: [
        ...messages,
        assistantText(
          `The online booking assistant isn't switched on yet. Please book using the form on this page, or ask the salon to add their ANTHROPIC_API_KEY.`,
        ),
      ],
    });
  }

  try {
    const updated = await runAssistant(ctx, messages);
    return NextResponse.json({ configured: true, messages: updated });
  } catch (err) {
    console.error("book-assistant error:", err);
    return NextResponse.json({
      configured: true,
      messages: [...messages, assistantText("Sorry — I hit a snag just now. Please try again, or use the booking form on this page.")],
    });
  }
}
