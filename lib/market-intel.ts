import { getBrowser, closeBrowser } from './browser';
import type { DatacenterLead } from './types';

/**
 * Scrape Google for real ITAD / datacenter liquidation companies.
 * Rotates queries each run.
 */

const LEAD_QUERIES = [
  'datacenter GPU liquidation company',
  'ITAD GPU decommission services',
  'datacenter asset recovery GPU',
  'bulk GPU liquidation service',
  'enterprise GPU buyback company',
  'data center equipment liquidator GPU',
  'GPU server decommission ITAD',
  'datacenter hardware reseller GPU bulk',
];

function pickLeadQueries(count: number = 2): string[] {
  const now = Date.now();
  return LEAD_QUERIES
    .map((q, i) => ({ q, sort: Math.sin(now / 1000 + i * 71.3) }))
    .sort((a, b) => a.sort - b.sort)
    .map(x => x.q)
    .slice(0, count);
}

export async function scrapeLeads(): Promise<DatacenterLead[]> {
  const queries = pickLeadQueries(2);
  const allLeads: DatacenterLead[] = [];

  try {
    const browser = await getBrowser();

    for (const query of queries) {
      const page = await browser.newPage();
      try {
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        await page.setRequestInterception(true);
        page.on('request', r => {
          if (['image', 'font', 'media', 'stylesheet'].includes(r.resourceType())) r.abort();
          else r.continue();
        });

        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        } catch { /* redirect possible */ }

        await new Promise(r => setTimeout(r, 3000));

        const results: { title: string; link: string; snippet: string }[] = await page.evaluate(() => {
          const items: { title: string; link: string; snippet: string }[] = [];
          const searchResults = document.querySelectorAll('#search .g, #rso .g');

          for (const g of searchResults) {
            const linkEl = g.querySelector('a[href^="http"]');
            const titleEl = g.querySelector('h3');
            const snippetEl = g.querySelector('[data-sncf], .VwiC3b, [style*="-webkit-line-clamp"]');

            if (!linkEl || !titleEl) continue;

            const link = (linkEl as HTMLAnchorElement).href;
            const title = titleEl.textContent?.trim() || '';
            const snippet = (snippetEl as HTMLElement)?.innerText?.trim() || '';

            // Skip Google/YouTube/Wikipedia/Reddit
            if (link.includes('google.com') || link.includes('youtube.com') || link.includes('wikipedia.org') || link.includes('reddit.com')) continue;

            if (title.length > 5 && items.length < 4) {
              items.push({ title, link, snippet: snippet.slice(0, 200) });
            }
          }
          return items;
        });

        for (const r of results) {
          // Extract domain
          let website = '';
          try { website = new URL(r.link).hostname.replace('www.', ''); } catch { continue; }

          // Determine type from content
          const text = (r.title + ' ' + r.snippet).toLowerCase();
          let type = 'Reseller';
          if (text.includes('itad') || text.includes('asset disposition') || text.includes('decommission')) type = 'ITAD';
          else if (text.includes('liquidat')) type = 'Liquidator';
          else if (text.includes('auction')) type = 'Auction';
          else if (text.includes('recycl') || text.includes('e-waste')) type = 'ITAD';

          // Extract location hints
          let location = 'USA';
          const locMatch = r.snippet.match(/([\w\s]+,\s*[A-Z]{2})/);
          if (locMatch) location = locMatch[1];

          allLeads.push({
            id: `lead-${Math.random().toString(36).slice(2, 8)}`,
            company: r.title.split(' - ')[0].split(' | ')[0].trim().slice(0, 60),
            website,
            type,
            description: r.snippet || r.title,
            location,
            outreachAngle: `Inquire about bulk GPU inventory from datacenter decommissions`,
            status: 'new',
            addedAt: new Date().toISOString(),
            notes: `Found via: "${query}"`,
          });
        }

        await page.close();
      } catch (err) {
        console.error(`[Leads] Error scraping "${query}":`, (err as Error).message);
        await page.close().catch(() => {});
      }
    }
  } finally {
    await closeBrowser();
  }

  // Dedup by website
  const seen = new Set<string>();
  return allLeads.filter(l => {
    if (seen.has(l.website)) return false;
    seen.add(l.website);
    return true;
  });
}
