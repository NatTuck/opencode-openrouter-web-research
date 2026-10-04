# web-research

An OpenCode custom tool and skill that gives any model real-time web research by
wrapping OpenRouter's [`openrouter:web_search`](https://openrouter.ai/docs/guides/features/server-tools/web-search)
server tool.

OpenRouter's web search is a *server tool*, not a callable REST endpoint: you
declare it on a chat completion, the model decides to search, and OpenRouter
returns a synthesized, cited answer. This tool performs that nested completion
and hands the answer back to the calling agent.

## Layout

```
web-research/
  README.md
  tools/
    web-research.ts            # registers the `web_research` tool
  skills/
    web-research/
      SKILL.md                 # guidance on when/how to use it
```

The directories mirror OpenCode's expected config layout so the whole thing can
be dropped into either a project or global config.

## Install

**Project-local** (available only in this repo):

```bash
mkdir -p .opencode
cp -r web-research/tools web-research/skills .opencode/
```

**Global** (available in every project):

```bash
cp -r web-research/tools web-research/skills ~/.config/opencode/
```

Restart OpenCode or start a new session to pick up the tool and skill. The tool
appears as `web_research` and the skill as `web-research`.

## Authentication

The tool resolves an OpenRouter API key in this order:

1. `$XDG_DATA_HOME/opencode/auth.json` (defaults to
   `~/.local/share/opencode/auth.json`), reading `.openrouter.key`.
2. The `OPENROUTER_API_KEY` environment variable.

If neither is present it throws a clear error. Log in with `opencode auth login`
or export the env var.

## Usage

The agent calls `web_research` on its own when it needs current information, or
you can ask for it directly.

| Argument | Type | Default | Description |
| - | - | - | - |
| `query` | string (required) | — | The research question or search query |
| `model` | string | `deepseek/deepseek-v4-flash` | OpenRouter model that synthesizes the answer |
| `engine` | enum | `auto` | `auto`, `native`, `exa`, `firecrawl`, `parallel`, `perplexity` |
| `mode` | string | engine default | Exa: `instant`/`fast`/`auto`/`deep-lite`/`deep`/`deep-reasoning`; Parallel: `turbo`/`fast`/`basic`/`advanced` |
| `max_results` | int (1–25) | `5` | Maximum results per search |
| `search_context_size` | enum | engine default | `low`, `medium`, `high` |
| `allowed_domains` | string[] | — | Limit results to these domains |
| `excluded_domains` | string[] | — | Exclude results from these domains |

### Engines

- `auto` *(default)* — native provider search when available, otherwise Exa.
  Self-selects, so it works with any model and avoids the pitfalls below.
- `native` — the provider's built-in search; falls back to Exa if unsupported.
- `exa` — Exa highlights; server-side key; supports both domain lists.
- `firecrawl` — BYOK: uses *your* Firecrawl credits; rejected when ZDR is enforced.
- `parallel` — server-side; domain lists are mutually exclusive.
- `perplexity` — server-side; domain lists are mutually exclusive.

Availability caveats: `firecrawl` is rejected under ZDR; on `us.openrouter.ai`
only `exa`/`auto`/omitted work; on `eu.openrouter.ai` no engine works; `native`
on Google models rejects domain filters.

## Cost

Each call adds a search fee **plus** a full nested model invocation (token cost
for the synthesis model). Keep `max_results` low unless depth is genuinely
needed. See the [pricing table](https://openrouter.ai/docs/guides/features/server-tools/web-search#pricing).

## Verifying

Call it with a current-events query and confirm a cited answer comes back. To
exercise the missing-key path, run with the key absent:

```bash
env -u OPENROUTER_API_KEY XDG_DATA_HOME=/tmp/nokey \
  bun -e 'import t from "./tools/web-research.ts"; await t.execute({ query: "test" }, {})'
```

It should throw `No OpenRouter API key found...`.
