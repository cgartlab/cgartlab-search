# cgartlab-search

A **harness-agnostic** unified search skill. One entry point routes a query to the best
backend(s) and returns normalized, source-attributed results that the model turns into a
cited summary. Works in any agent harness that can make HTTP calls (DSH, Claude Code,
Codex, opencode, ...), including restricted-egress environments via web_fetch.

## Backends

| Backend | Best for | Transport | Key |
|---|---|---|---|
| bing (cn.bing.com RSS) | general web, facts, query news | curl + web_fetch | none |
| context7 | library/framework/API docs | curl + web_fetch | none |
| qqnews (腾讯新闻热榜) | latest/hot Chinese news | curl + web_fetch | none |
| hupu (虎扑足球) | 足球/体育 news | curl + web_fetch | none |
| so (Stack Overflow) | dev Q&A / error fixes | curl + web_fetch | none |
| github | repo/tool discovery | curl + web_fetch | none |
| hn (Algolia) | tech community signal | curl + web_fetch | none |
| brave | general web / news (quality) | curl only (header auth) | BRAVE_SEARCH_API_KEY |
| exa | deep research / semantic | curl only (POST + auth) | EXA_API_KEY |
| tencent (official API) | Chinese news (endpoint pending) | curl | TENCENT_NEWS_KEY |
| zhihu | Chinese knowledge (pending) | endpoint pending | ZHIHU_API_KEY |

## Requirements

- **Normal harness**: a shell with `curl` (macOS/Linux/Windows 10+) — all backends.
- **DSH / restricted egress**: the harness's `web_fetch` tool — all key-less backends.
  See `references/backends.md` for the verified host-reachability map.

## Install

Copy the `cgartlab-search/` folder into your harness's skill directory:

- DSH: `~/.dsh/skills/`
- Claude Code: `~/.claude/skills/` or project `.claude/skills/`
- Others: see your harness's skill docs.

## Keys

Key-less backends need nothing. For brave/exa/tencent/zhihu set env vars
(`BRAVE_SEARCH_API_KEY`, `EXA_API_KEY`, `TENCENT_NEWS_KEY`, `ZHIHU_API_KEY`) or place a
`secrets.json` next to SKILL.md (see `secrets.example.json`). `secrets.json` is gitignored.

## Usage

Ask in natural language — "查一下 ...", "搜搜最新足球比赛新闻", "最近有什么重大新闻",
"React 的 use() 怎么用", "全面调研 ...". The skill triggers and routes automatically.
Direct invocation: `node scripts/search.mjs <backends> "<query>" --limit 5`.

## Status (verified 2026-10-01)

- 7 key-less backends live-verified in DSH via web_fetch.
- brave/exa wired (curl) — unreachable from DSH's GFW-like egress.
- tencent endpoint pending (official zip blocked by binary-download sandbox);
  zhihu pending (public API 403 anti-bot) — bing site:zhihu.com fallback documented.