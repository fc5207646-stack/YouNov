import fs from 'node:fs';
import path from 'node:path';

const SITE_ORIGIN = (process.env.SITE_ORIGIN || process.env.VITE_SITE_ORIGIN || 'http://localhost').replace(/\/+$/, '');
const API_BASE = (process.env.SITEMAP_API_BASE || process.env.API_BASE || 'http://localhost/api').replace(/\/+$/, '');

async function safeJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function urlEntry(loc, lastmod = new Date()) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`,
    '    <changefreq>daily</changefreq>',
    '    <priority>0.8</priority>',
    '  </url>'
  ].join('\n');
}

async function main() {
  const staticRoutes = ['/', '/browse', '/subscription', '/promotion', '/login', '/register'];

  const urls = [];
  for (const r of staticRoutes) urls.push(urlEntry(`${SITE_ORIGIN}${r}`));

  // 动态小说/章节
  const novels = await safeJson(`${API_BASE}/novels?take=2000&skip=0`);
  const items = novels?.items || [];
  for (const n of items) {
    urls.push(urlEntry(`${SITE_ORIGIN}/novel/${encodeURIComponent(n.slug)}`, n.updatedAt || new Date()));
    const chapters = await safeJson(`${API_BASE}/novels/${encodeURIComponent(n.slug)}/chapters`);
    for (const c of chapters?.chapters || []) {
      urls.push(urlEntry(`${SITE_ORIGIN}/novel/${encodeURIComponent(n.slug)}/chapter/${encodeURIComponent(c.id)}`, new Date()));
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');

  const outPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`sitemap generated: ${outPath} (${urls.length} urls)`);
}

main().catch((e) => {
  console.error('generate-sitemap failed:', e);
  process.exit(1);
});

