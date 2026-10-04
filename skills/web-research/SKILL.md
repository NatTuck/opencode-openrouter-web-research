---
name: web-research
description: Research current or real-time information from the web with the web_research tool. Use when a question depends on facts after the model's training cutoff, live news/prices/events, or anything that must be verified against current sources.
---

## What I do
- Call the `web_research` tool, which runs an OpenRouter web search and returns a synthesized, cited answer.

## When to use me
Use for current or real-time information the model cannot know: recent news, releases, prices, events, or facts that must be verified against live sources.

Do not use for stable knowledge (math, well-known history, concepts) or when a plain URL fetch with `webfetch` already answers the question.

## How
- Call `web_research` with a clear, specific `query`.
- Optional arguments: `engine` (default `auto`), `mode`, `max_results` (default 5), `search_context_size`, `allowed_domains`, `excluded_domains`, and `model`.
- The result is synthesized text with citations, not raw links. When relaying it, preserve and link the cited sources.
- Each call costs an extra model invocation plus a search fee, so keep `max_results` low unless depth is genuinely needed.
