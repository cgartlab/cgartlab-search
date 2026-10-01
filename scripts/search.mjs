#!/usr/bin/env node
// cgartlab-search dispatcher — zero-dependency Node ESM (Node 18+ global fetch).
// Works in harnesses whose shell can reach the network (Claude Code, Codex, opencode, terminal).
// In DSH's sandboxed shell (no outbound network) use web_fetch instead — see references/backends.md.
//
// Usage:
//   node search.mjs <backends> "<query>" [--limit N] [--topic T] [--library ID] [--news]
//   backends: comma list from brave,exa,context7,tencent,zhihu,bing,qqnews,hupu,so,github,hn
//
// Keyed backends read env vars BRAVE_SEARCH_API_KEY EXA_API_KEY CONTEXT7_API_KEY
// TENCENT_NEWS_KEY ZHIHU_API_KEY (fallback: secrets.json next to this script).
// Key-less backends (bing,context7,qqnews,hupu,so,github,hn) need nothing.
// Output: one line of normalized JSON on stdout. Exit 0 if any backend returned results.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? (argv.splice(i, 2)[1] ?? null) : null; };
const limit = +(flag('--limit') ?? 5);
const topic = flag('--topic');
const libOverride = flag('--library');
const wantNews = argv.includes('--news'); if (wantNews) argv.splice(argv.indexOf('--news'), 1);
const backends = (argv[0] || '').split(',').map(s => s.trim()).filter(Boolean);
const query = argv.slice(1).join(' ').trim();

const ENV_KEYS = { brave: 'BRAVE_SEARCH_API_KEY', exa: 'EXA_API_KEY', context7: 'CONTEXT7_API_KEY', tencent: 'TENCENT_NEWS_KEY', zhihu: 'ZHIHU_API_KEY' };
const FILE_KEYS = { brave: 'brave_api_key', exa: 'exa_api_key', context7: 'context7_api_key', tencent: 'tencent_news_key', zhihu: 'zhihu_api_key' };
const secrets = {};
for (const b of Object.keys(ENV_KEYS)) { const v = process.env[ENV_KEYS[b]]; if (v) secrets[b] = v; }
try {
  const f = JSON.parse(readFileSync(join(here, 'secrets.json'), 'utf8'));
  for (const b of Object.keys(FILE_KEYS)) if (!secrets[b] && f[FILE_KEYS[b]]) secrets[b] = f[FILE_KEYS[b]];
} catch { /* env-only mode */ }
const enc = s => encodeURIComponent(s);
const unent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');

// --- A. key-less backends ---

async function bing() {
  const r = await fetch(`https://cn.bing.com/search?q=${enc(query)}&format=rss`);
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const xml = await r.text();
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g; let m;
  const field = (src, tag) => {
    const mm = src.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
    return mm ? unent(mm[1].trim()) : '';
  };
  while ((m = re.exec(xml)) && out.length < limit) {
    const t = field(m[1], 'title'), u = field(m[1], 'link');
    if (!t || !u) continue;
    out.push({ backend: 'bing', type: wantNews ? 'news' : 'web', title: t, url: u,
      snippet: field(m[1], 'description'), published: field(m[1], 'pubDate') || null });
  }
  return { results: out };
}

async function qqnews() {
  const r = await fetch(`https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=${Math.max(limit, 10)}`);
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const j = await r.json();
  const list = (j.idlist?.[0]?.newslist) || [];
  const out = list.filter(x => x.url && x.title).slice(0, limit).map(x => ({
    backend: 'qqnews', type: 'news', title: x.title, url: x.url,
    snippet: String(x.abstract || '').slice(0, 300), published: x.time || null,
    source: x.card?.chlname || null, score: x.readCount ?? null,
  }));
  return { results: out, note: '腾讯新闻热榜（全站热门，未按 query 过滤）' };
}

async function hupu() {
  const r = await fetch('https://soccer.hupu.com/');
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const html = await r.text();
  const re = /<a[^>]+href=["'](https:\/\/bbs\.hupu\.com\/\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set(); const out = []; let m;
  while ((m = re.exec(html))) {
    const title = unent(m[2].replace(/<[^>]+>/g, '')).trim();
    if (title.length < 8 || seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ backend: 'hupu', type: 'news', title, url: m[1], snippet: '' });
    if (out.length >= limit) break;
  }
  return out.length ? { results: out } : { error: 'no items parsed (page layout changed?)' };
}

async function so() {
  const r = await fetch(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${enc(query)}&site=stackoverflow&pagesize=${limit}`);
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const j = await r.json();
  return { results: (j.items || []).map(x => ({
    backend: 'so', type: 'qa', title: unent(x.title || ''), url: x.link,
    snippet: `[${(x.tags || []).slice(0, 5).join(', ')}] ${x.is_answered ? 'answered' : 'unanswered'} · ${x.view_count} views`,
    score: x.score ?? null,
    published: x.creation_date ? new Date(x.creation_date * 1000).toISOString() : null,
  })) };
}

async function github() {
  const r = await fetch(`https://api.github.com/search/repositories?q=${enc(query)}&sort=stars&per_page=${limit}`,
    { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 403) return { error: 'rate-limited (unauthenticated: ~10 search req/min)' };
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const j = await r.json();
  return { results: (j.items || []).map(x => ({
    backend: 'github', type: 'repo', title: x.full_name, url: x.html_url,
    snippet: String(x.description || '').slice(0, 300), score: x.stargazers_count ?? null,
    published: x.pushed_at || null,
  })) };
}

async function hn() {
  const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${enc(query)}&hitsPerPage=${limit}`);
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const j = await r.json();
  return { results: (j.hits || []).filter(x => x.title).map(x => ({
    backend: 'hn', type: 'community', title: x.title,
    url: x.url || `https://news.ycombinator.com/item?id=${x.objectID}`,
    snippet: `${x.points || 0} points · ${x.num_comments || 0} comments`,
    published: x.created_at || null,
  })) };
}

async function context7() {
  let id = libOverride;
  let title = id;
  if (!id) {
    const r = await fetch(`https://context7.com/api/v1/search?query=${enc(query)}`);
    if (!r.ok) return { error: `search HTTP ${r.status}` };
    const j = await r.json();
    const top = (j.results || []).find(x => x.verified) || (j.results || [])[0];
    if (!top) return { error: 'no library found' };
    id = top.id; title = top.title || id;
  }
  const idEnc = enc(id.replace(/^\//, ''));
  const url = `https://context7.com/api/v1/${idEnc}?tokens=4000` + (topic ? `&topic=${enc(topic)}` : '');
  const r2 = await fetch(url);
  if (!r2.ok) return { error: `fetch HTTP ${r2.status}` };
  const content = await r2.text();
  return { results: [{ backend: 'context7', type: 'docs', library: id, title, url: `https://context7.com/${id}`, content }] };
}

// --- B. keyed backends ---

async function brave() {
  if (!secrets.brave) return { error: 'missing key' };
  const path = wantNews ? 'news/search' : 'web/search';
  const r = await fetch(`https://api.search.brave.com/res/v1/${path}?q=${enc(query)}&count=${limit}`,
    { headers: { 'X-Subscription-Token': secrets.brave, Accept: 'application/json' } });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const j = await r.json();
  const arr = (wantNews ? j.news?.results : j.web?.results) || [];
  return { results: arr.map(x => ({ backend: 'brave', type: wantNews ? 'news' : 'web', title: x.title, url: x.url, snippet: x.description || x.text || '', published: x.age || x.publish_date || null })) };
}

async function exa() {
  if (!secrets.exa) return { error: 'missing key' };
  const r = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': secrets.exa, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, numResults: limit, type: 'auto', contents: { text: true, maxCharacters: 1000 } }),
  });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const j = await r.json();
  return { results: (j.results || []).map(x => ({ backend: 'exa', type: 'web', title: x.title, url: x.url, snippet: (x.text || '').slice(0, 300), score: x.score ?? null, published: x.publishedDate || null })) };
}

async function tencent() {
  // TODO: paste endpoint extracted from the official tencent-news skill zip (see references/backends.md).
  return { error: 'not configured: paste endpoint from tencent-news skill (see references/backends.md)' };
}
async function zhihu() {
  // TODO: paste endpoint provided by user (see references/backends.md). Public API 403s (anti-bot).
  return { error: 'not configured: paste endpoint (see references/backends.md); use bing site:zhihu.com meanwhile' };
}

const ADAPTERS = { bing, qqnews, hupu, so, github, hn, context7, brave, exa, tencent, zhihu };
const out = { query, backends, results: [], errors: [], notes: [] };
for (const b of backends) {
  if (!ADAPTERS[b]) out.errors.push({ backend: b, error: `unknown backend (choose: ${Object.keys(ADAPTERS).join(',')})` });
}
await Promise.all(backends.filter(b => ADAPTERS[b]).map(async (b) => {
  try {
    const res = await ADAPTERS[b]();
    if (res.results) out.results.push(...res.results);
    if (res.error) out.errors.push({ backend: b, error: res.error });
    if (res.note) out.notes.push({ backend: b, note: res.note });
  } catch (e) {
    out.errors.push({ backend: b, error: String(e?.message || e) });
  }
}));
process.stdout.write(JSON.stringify(out));
process.exit(out.results.length ? 0 : 1);