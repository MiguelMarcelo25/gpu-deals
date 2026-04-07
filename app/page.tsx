'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Newspaper, Clock, Cpu, Activity, RefreshCw, Radio,
  TrendingDown, Monitor, BrainCircuit, ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

interface NewsItem {
  headline: string;
  source: string;
  link: string;
  time: string;
  publishedAt: number;
}

interface LogEntry { msg: string; type: string; }

// ─── Categorize news ─────────────────────────────────────

function categorize(news: NewsItem[]) {
  const price: NewsItem[] = [];
  const industry: NewsItem[] = [];
  const ai: NewsItem[] = [];

  for (const n of news) {
    const h = n.headline.toLowerCase();
    if (h.includes('price') || h.includes('drop') || h.includes('deal') || h.includes('sale') || h.includes('discount') || h.includes('msrp') || h.includes('cheap') || h.includes('restock') || h.includes('stock') || h.includes('availability')) {
      price.push(n);
    } else if (h.includes('ai ') || h.includes('datacenter') || h.includes('data center') || h.includes('cloud') || h.includes('h100') || h.includes('h200') || h.includes('b200') || h.includes('inference') || h.includes('training')) {
      ai.push(n);
    } else {
      industry.push(n);
    }
  }

  return { price, industry, ai };
}

// ─── Dashboard ────────────────────────────────────────────

export default function Dashboard() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastScraped, setLastScraped] = useState('');
  const [clock, setClock] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([{ msg: 'System online. Ready to fetch news.', type: 'info' }]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { fetchNews(); }, []);

  function log(msg: string, type = '') {
    setLogs(prev => [...prev.slice(-50), { msg: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' › ' + msg, type }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }

  async function fetchNews() {
    setLoading(true);
    log('Fetching GPU news from Google News...', 'info');
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success) {
        setNews(data.news || []);
        setLastScraped(data.scrapedAt || '');
        setLoaded(true);
        log(`Loaded ${data.news?.length || 0} headlines`, 'ok');
      } else {
        log('Error: ' + data.error, 'err');
      }
    } catch (err) {
      log('Failed: ' + (err as Error).message, 'err');
    }
    setLoading(false);
  }

  const { price, industry, ai } = categorize(news);

  return (
    <>
      <div className="mesh-bg" />
      <div className="relative z-10 min-h-screen">

        {/* ═══ TOP BAR ═══ */}
        <header className="sticky top-0 z-50 border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">GPU Deals</span>
              <span className="text-[10px] text-zinc-600 font-mono hidden sm:inline">GPU NEWS</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-mono text-zinc-500">
                <Radio className={`w-3 h-3 ${loading ? 'text-amber-400 animate-pulse' : loaded ? 'text-accent2' : 'text-zinc-600'}`} />
                {loading ? 'FETCHING' : loaded ? 'LIVE' : 'OFFLINE'}
              </div>
              <div className="h-4 w-px bg-dark-border hidden sm:block" />
              <span className="text-[11px] font-mono text-zinc-600 hidden sm:inline">{clock}</span>
              <div className="h-4 w-px bg-dark-border" />
              <button onClick={fetchNews} disabled={loading} className="p-1.5 rounded-lg hover:bg-dark-surface2 text-zinc-500 hover:text-white transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-4 sm:py-6">

          {/* ═══ STATS ROW ═══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[
              { label: 'HEADLINES', value: news.length, sub: 'from Google News', icon: Newspaper, color: 'text-accent' },
              { label: 'PRICE NEWS', value: price.length, sub: 'deals & drops', icon: TrendingDown, color: 'text-emerald-400' },
              { label: 'INDUSTRY', value: industry.length, sub: 'launches & reviews', icon: Monitor, color: 'text-blue-400' },
              { label: 'AI & DC', value: ai.length, sub: 'datacenter & AI', icon: BrainCircuit, color: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="panel rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-widest text-zinc-600">{s.label}</span>
                  <s.icon className={`w-3.5 h-3.5 ${s.color} opacity-50`} />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ═══ MAIN LAYOUT ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 sm:gap-6">

            {/* LEFT: News */}
            <div className="space-y-4">

              {/* Price & Deals */}
              {price.length > 0 && (
                <div className="fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">GPU Prices & Deals</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/8 text-emerald-400 font-bold">LIVE</span>
                  </div>
                  <div className="space-y-2">
                    {price.map((n, i) => <NewsCard key={`p-${i}`} item={n} />)}
                  </div>
                </div>
              )}

              {/* Industry */}
              {industry.length > 0 && (
                <div className="fade-in">
                  <div className="flex items-center gap-2 mb-3 mt-6">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Industry & Launches</span>
                  </div>
                  <div className="space-y-2">
                    {industry.map((n, i) => <NewsCard key={`i-${i}`} item={n} />)}
                  </div>
                </div>
              )}

              {/* AI & Datacenter */}
              {ai.length > 0 && (
                <div className="fade-in">
                  <div className="flex items-center gap-2 mb-3 mt-6">
                    <BrainCircuit className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">AI & Datacenter</span>
                  </div>
                  <div className="space-y-2">
                    {ai.map((n, i) => <NewsCard key={`a-${i}`} item={n} />)}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && news.length === 0 && (
                <div className="panel rounded-xl py-20 text-center">
                  <div className="w-12 h-12 rounded-xl bg-dark-surface2 flex items-center justify-center mx-auto mb-4">
                    <Newspaper className="w-5 h-5 text-zinc-700" />
                  </div>
                  <p className="text-xs text-zinc-600">No news yet. Hit refresh to fetch latest GPU headlines.</p>
                </div>
              )}

              {/* Loading */}
              {loading && news.length === 0 && (
                <div className="panel rounded-xl py-20 text-center">
                  <RefreshCw className="w-6 h-6 text-accent mx-auto mb-3 animate-spin" />
                  <p className="text-xs text-zinc-500">Scraping Google News...</p>
                </div>
              )}
            </div>

            {/* RIGHT: Sidebar */}
            <div className="space-y-4">

              {/* Discord Status */}
              <div className="panel-solid rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-bold tracking-widest text-zinc-500">DISCORD</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent2 pulse-ring text-accent2" />
                  <span className="text-xs text-zinc-400">Auto-posting every 12h</span>
                </div>
                <div className="text-[10px] text-zinc-600 mt-2">Next: 12:00 PM UTC</div>
              </div>

              {/* Last Scraped */}
              {lastScraped && (
                <div className="panel-solid rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] font-bold tracking-widest text-zinc-500">LAST SCRAPED</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(lastScraped).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              )}

              {/* Activity Log */}
              <div className="panel-solid rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-dark-border flex items-center gap-2">
                  <Activity className="w-3 h-3 text-zinc-600" />
                  <span className="text-[10px] font-bold tracking-widest text-zinc-600">LOG</span>
                </div>
                <div ref={logRef} className="px-4 py-2 font-mono text-[10px] max-h-40 overflow-y-auto scrollbar-thin space-y-0.5">
                  {logs.map((l, i) => (
                    <div key={i} className={
                      l.type === 'ok' ? 'text-accent2' :
                      l.type === 'err' ? 'text-rose-400' :
                      l.type === 'info' ? 'text-blue-400/60' : 'text-zinc-700'
                    }>{l.msg}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 pb-6">
            <span className="text-[10px] text-zinc-800 font-mono">OPENCLAW GPU NEWS v2.0</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── News Card Component ─────────────────────────────────

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.link} target="_blank" rel="noreferrer"
      className="panel rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-start justify-between hover:border-dark-border2 transition-all group">
      <div className="flex-1 min-w-0 mr-2 sm:mr-3">
        <p className="text-xs sm:text-[13px] text-zinc-300 font-medium leading-snug group-hover:text-white transition-colors">
          {item.headline}
        </p>
        <div className="flex items-center gap-2 mt-1.5 sm:mt-2 text-[10px] text-zinc-600">
          <span className="font-medium">{item.source}</span>
          {item.time && <><span>·</span><span>{item.time}</span></>}
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-zinc-700 group-hover:text-accent transition-colors shrink-0 mt-1" />
    </a>
  );
}
