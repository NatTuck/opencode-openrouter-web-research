import { tool } from "@opencode-ai/plugin"
import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash"
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

async function resolveApiKey(): Promise<string> {
  const dataHome = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share")
  const authPath = path.join(dataHome, "opencode", "auth.json")

  try {
    const raw = await readFile(authPath, "utf8")
    const auth = JSON.parse(raw)
    const key = auth?.openrouter?.key
    if (typeof key === "string" && key.length > 0) return key
  } catch {
    // fall through to environment
  }

  const envKey = process.env.OPENROUTER_API_KEY
  if (envKey && envKey.length > 0) return envKey

  throw new Error(
    `No OpenRouter API key found. Log in with 'opencode auth login' (expected at ${authPath}) or export OPENROUTER_API_KEY.`,
  )
}

export default tool({
  description:
    "Research current or real-time information on the web through OpenRouter's web_search server tool. Returns a synthesized, cited answer rather than raw links. Use for facts beyond the model's training data; each call adds an extra model invocation plus a search fee.",
  args: {
    query: tool.schema.string().describe("The research question or search query"),
    model: tool.schema
      .string()
      .optional()
      .describe(`OpenRouter model that synthesizes the answer (default: ${DEFAULT_MODEL})`),
    engine: tool.schema
      .enum(["auto", "native", "exa", "firecrawl", "parallel", "perplexity"])
      .optional()
      .describe("Search engine; 'auto' uses native search when available and otherwise Exa"),
    mode: tool.schema
      .string()
      .optional()
      .describe(
        "Engine-specific mode (Exa: instant|fast|auto|deep-lite|deep|deep-reasoning; Parallel: turbo|fast|basic|advanced)",
      ),
    max_results: tool.schema
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("Maximum results per search (1-25; default 5)"),
    search_context_size: tool.schema
      .enum(["low", "medium", "high"])
      .optional()
      .describe("How much context to retrieve per result"),
    allowed_domains: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Limit results to these domains"),
    excluded_domains: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Exclude results from these domains"),
  },
  async execute(args) {
    const apiKey = await resolveApiKey()

    const parameters: Record<string, unknown> = {
      engine: args.engine ?? "auto",
      max_results: args.max_results ?? 5,
    }
    if (args.mode) parameters.mode = args.mode
    if (args.search_context_size) parameters.search_context_size = args.search_context_size
    if (args.allowed_domains?.length) parameters.allowed_domains = args.allowed_domains
    if (args.excluded_domains?.length) parameters.excluded_domains = args.excluded_domains

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model ?? DEFAULT_MODEL,
        messages: [{ role: "user", content: args.query }],
        tools: [{ type: "openrouter:web_search", parameters }],
      }),
    })

    const bodyText = await response.text()
    if (!response.ok) {
      throw new Error(`OpenRouter web search failed (${response.status}): ${bodyText}`)
    }

    let data: any
    try {
      data = JSON.parse(bodyText)
    } catch {
      throw new Error(`OpenRouter returned a non-JSON response: ${bodyText.slice(0, 500)}`)
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string" || content.length === 0) {
      throw new Error(`OpenRouter returned no answer: ${bodyText.slice(0, 500)}`)
    }
    return content
  },
})
