import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic client for server-side AI features.
 *
 * The API key comes from ANTHROPIC_API_KEY (see .env.example). The model is
 * configurable via ANTHROPIC_MODEL — it defaults to Claude Opus, but a salon
 * that wants faster/cheaper replies for the public booking assistant can set
 * e.g. ANTHROPIC_MODEL="claude-haiku-4-5".
 */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

/** Returns the Anthropic client, or null when no API key is configured. */
export function getAnthropic(): Anthropic | null {
  if (!aiConfigured()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}
