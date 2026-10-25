import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey, anthropicModel } from "./env";

export class AnthropicConfigError extends Error {
  constructor(message = "ANTHROPIC_API_KEY is not configured on the server.") {
    super(message);
    this.name = "AnthropicConfigError";
  }
}

/** Official Anthropic client. Throws if the server key is missing. Never log the key. */
export function createAnthropicClient(): Anthropic {
  const apiKey = anthropicApiKey();
  if (!apiKey) throw new AnthropicConfigError();
  return new Anthropic({ apiKey, timeout: 20_000 });
}

export function configuredModel(): string {
  return anthropicModel();
}

export async function completeJson(system: string, user: string, maxTokens = 900): Promise<string> {
  const client = createAnthropicClient();
  const result = await client.messages.create({
    model: configuredModel(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user.slice(0, 12_000) }],
  });
  return result.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
