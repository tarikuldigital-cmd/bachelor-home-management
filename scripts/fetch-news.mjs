// Fetch today's headlines from several Bangladeshi news RSS feeds and write news.json.
// Runs in GitHub Actions on a schedule (no CORS issues, no API key). Feeds that fail are skipped.
import fs from 'node:fs';

const FEEDS = [
  { id: 'bbc', name: 'BBC বাংলা', url: 'https://feeds.bbci.co.uk/bengali/rss.xml', lang: 'bn' },
  { id: 'prothomalo', name: 'প্রথম আলো', url: 'https://www.prothomalo.com/feed/', lang: 'bn' },
  { id: 'jugantor', name: 'যুগান্তর', url: 'https://www.jugantor.com/feed/rss.xml', lang: 'bn' },
  { id: 'kalerkantho', name: 'কালের কণ্ঠ', url: 'https://www.kalerkantho.com/rss.xml', lang: 'bn' },
  { id: 'banglatribune', name: 'বাংলা ট্রিবিউন', url: 'https://www.banglatribune.com/feed/', lang: 'bn' },
  { id: 'samakal', name: 'সমকাল', url: 'https://samakal.com/feed', lang: 'bn' },
  { id: 'dailystar', name: 'The Daily Star', url: 'https://www.thedailystar.net/frontpage/rss.xml', lang: 'en' },
  { id: 'dhakatribune', name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com/feed/', lang: 'en' },
  { id: 'tbs', name: 'The Business Standard', url: 'https://www.tbsnews.net/top-news/rss.xml', lang: 'en' },
];
const PER_SOURCE = 10;

const decode = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = tag(b, 'title');
    let link = tag(b, 'link');
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i);
      link = m ? m[1] : '';
    }
    const date = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const t = Date.parse(date);
    if (title && /^https?:\/\//.test(link)) items.push({ title, link, time: Number.isNaN(t) ? null : new Date(t).toISOString() });
  }
  return items;
}

async function getFeed(f) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(f.url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (BachelorHome news reader)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const items = parseFeed(await r.text()).slice(0, PER_SOURCE);
    console.log(`✓ ${f.name}: ${items.length}`);
    return items.map((x) => ({ ...x, source: f.id }));
  } catch (e) {
    console.log(`✗ ${f.name}: ${e.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || 'news.json';
  const results = (await Promise.all(FEEDS.map(getFeed))).flat();
  const seen = new Set();
  const items = results.filter((x) => (seen.has(x.link) ? false : seen.add(x.link)));
  items.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  const sources = FEEDS.filter((f) => items.some((x) => x.source === f.id)).map(({ id, name, lang }) => ({ id, name, lang }));
  fs.writeFileSync(out, JSON.stringify({ updated: new Date().toISOString(), sources, items }));
  console.log(`news.json: ${items.length} headlines from ${sources.length} sources`);
}
